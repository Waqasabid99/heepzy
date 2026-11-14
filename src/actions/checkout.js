"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { rememberAddress } from "@/lib/addresses";
import { env } from "@/lib/env";
import { getCart } from "@/lib/cart";
import { getStoreSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/session";
import { getClientIp } from "@/lib/request";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { CATALOG_TAG } from "@/lib/catalog";
import { canonicalCity } from "@/lib/pk-cities";
import { normalizePhone } from "@/lib/phone";
import { isStaff } from "@/lib/roles";
import { newAccessToken, nextOrderNumber, PROVINCES, quote } from "@/lib/checkout";
import { createCheckout, safepayConfigured } from "@/lib/payments/safepay";
import { createOrder, getOrderForViewer } from "@/lib/orders";

const appUrl = () => env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

async function availableLines() {
  const cart = await getCart();
  return { cart, lines: cart.lines.filter((l) => l.available) };
}

async function paymentOptions(settings) {
  return { card: settings.cardPaymentsEnabled && (await safepayConfigured()), cod: settings.codEnabled };
}

/**
 * Live quote for the checkout page (delivery options, voucher, totals).
 * `applyCoupon` marks an explicit "Apply" click, which is rate limited.
 */
export async function quoteCheckout(input) {
  const data = z
    .object({
      city: z.string().trim().max(80).default(""),
      province: z.union([z.literal(""), z.enum(Object.keys(PROVINCES))]).default(""),
      rateId: z.string().max(40).default(""),
      paymentMethod: z.enum(["COD", "CARD"]).default("COD"),
      couponCode: z.string().trim().max(40).default(""),
      email: z.string().trim().max(191).default(""),
      applyCoupon: z.boolean().default(false),
    })
    .safeParse(input ?? {});
  if (!data.success) return { ok: false, message: "Invalid request." };
  const q = data.data;

  if (q.applyCoupon) {
    const rl = await rateLimit("applyCoupon", LIMITS.applyCoupon);
    if (!rl.ok) return { ok: false, message: "Too many voucher attempts. Please wait a few minutes." };
  }
  const [{ lines }, settings, user] = await Promise.all([availableLines(), getStoreSettings(), getCurrentUser()]);
  const result = await quote({
    lines,
    settings,
    city: q.city,
    province: q.province || null,
    rateId: q.rateId,
    paymentMethod: q.paymentMethod,
    couponCode: q.couponCode,
    email: q.email || user?.email,
    userId: user?.id,
  });
  return { ok: true, quote: result };
}

const orderSchema = z.object({
  email: z
    .email("Enter a valid email address")
    .max(191)
    .transform((s) => s.toLowerCase()),
  phone: z.string().transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) ctx.addIssue({ code: "custom", message: "Enter a Pakistani mobile number, e.g. 0300 1234567" });
    return p ?? "";
  }),
  fullName: z.string().trim().min(2, "Enter the recipient's full name").max(120),
  line1: z.string().trim().min(5, "Enter the house/street address").max(255),
  line2: z.string().trim().max(255).default(""),
  city: z.string().trim().min(2, "Choose your city").max(80),
  province: z.enum(Object.keys(PROVINCES), { error: "Choose your province" }),
  postalCode: z.union([z.literal(""), z.string().regex(/^\d{5}$/, "Postal code is 5 digits")]).default(""),
  rateId: z.string().min(1, "Choose a delivery option").max(40),
  paymentMethod: z.enum(["COD", "CARD"], { error: "Choose how you'd like to pay" }),
  couponCode: z.string().trim().max(40).default(""),
  note: z.string().trim().max(500).default(""),
});

function fail(errors, message) {
  return { ok: false, errors, message };
}

/** Place the order: re-price from the database, reserve stock, then COD confirmation or Safepay redirect. */
export async function placeOrder(_prev, formData) {
  const rl = await rateLimit("checkout", LIMITS.checkout);
  if (!rl.ok) return fail({}, "Too many attempts. Please wait a few minutes and try again.");

  const raw = Object.fromEntries(
    [
      "email",
      "phone",
      "fullName",
      "line1",
      "line2",
      "city",
      "province",
      "postalCode",
      "rateId",
      "paymentMethod",
      "couponCode",
      "note",
    ].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = orderSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = {};
    for (const i of parsed.error.issues) errors[i.path[0]] ??= i.message;
    return fail(errors);
  }
  const f = parsed.data;
  f.city = canonicalCity(f.province, f.city) ?? f.city.replace(/\s+/g, " ");

  const [{ cart, lines }, settings, user] = await Promise.all([availableLines(), getStoreSettings(), getCurrentUser()]);
  if (settings.maintenanceMode && !isStaff(user?.role)) {
    return fail({}, "The store is closed for maintenance. Please try again soon.");
  }
  if (!user && !settings.guestCheckoutEnabled) return fail({}, "Please sign in to place an order.");
  if (!lines.length) return fail({}, "Your bag is empty.");
  const problems = cart.lines.filter((l) => !l.available || l.quantity > l.stock);
  if (problems.length) {
    return fail(
      {},
      `Some items changed: ${problems.map((l) => `${l.name} (${l.color}, ${l.size})`).join(", ")}. Please review your bag.`,
    );
  }

  const q = await quote({
    lines,
    settings,
    city: f.city,
    province: f.province,
    rateId: f.rateId,
    paymentMethod: f.paymentMethod,
    couponCode: f.couponCode,
    email: f.email,
    userId: user?.id,
  });
  if (!q.rate || q.rate.id !== f.rateId)
    return fail({ rateId: "That delivery option isn't available for this address" });
  if (f.couponCode && !q.coupon) return fail({ couponCode: q.couponMessage ?? "That voucher can't be used" });
  const pay = await paymentOptions(settings);
  if (f.paymentMethod === "COD" && (!pay.cod || !q.codAllowed)) {
    return fail({ paymentMethod: "Cash on delivery isn't available for this order. Please pay by card." });
  }
  if (f.paymentMethod === "CARD" && !pay.card)
    return fail({ paymentMethod: "Card payments are not available right now." });

  const orderNumber = await nextOrderNumber();
  const access = newAccessToken();
  const viewUrl = `/checkout/complete/${orderNumber}?t=${access.token}`;

  // Start the Safepay session first: if it fails, nothing has been reserved yet.
  let checkout = null;
  if (f.paymentMethod === "CARD") {
    try {
      checkout = await createCheckout({
        amount: q.grandTotal,
        orderNumber,
        redirectUrl: `${appUrl()}/checkout/safepay/return?order=${orderNumber}&t=${access.token}`,
        cancelUrl: `${appUrl()}/checkout/safepay/cancel?order=${orderNumber}&t=${access.token}`,
      });
    } catch (e) {
      console.error("[checkout] Safepay session failed", e);
      return fail({}, "We couldn't start the card payment. Please try again, or choose cash on delivery.");
    }
  }

  try {
    await createOrder({
      orderNumber,
      accessHash: access.hash,
      userId: user?.id ?? null,
      email: f.email,
      phone: f.phone,
      ship: {
        fullName: f.fullName,
        phone: f.phone,
        line1: f.line1,
        line2: f.line2,
        city: f.city,
        province: f.province,
        postalCode: f.postalCode,
      },
      lines,
      q,
      paymentMethod: f.paymentMethod,
      paymentStatus: f.paymentMethod === "CARD" ? "PENDING" : "UNPAID",
      payment: {
        provider: f.paymentMethod === "CARD" ? "SAFEPAY" : "COD",
        status: f.paymentMethod === "CARD" ? "PENDING" : "INITIATED",
        providerPaymentId: checkout?.tracker ?? null,
      },
      customerNote: f.note || null,
      ipAddress: await getClientIp(),
      clearCartId: cart.id,
    });
  } catch (e) {
    const msg = String(e?.message ?? "");
    if (msg.startsWith("OUT_OF_STOCK:")) {
      return fail({}, `Sorry, ${msg.slice(13)} just sold out. Please update your bag.`);
    }
    if (msg === "COUPON_USED") return fail({ couponCode: "This voucher has just been fully used." });
    throw e;
  }

  // Signed-in customers get the address saved to their account for next time.
  if (user) {
    await rememberAddress(user.id, {
      fullName: f.fullName,
      phone: f.phone,
      line1: f.line1,
      line2: f.line2,
      city: f.city,
      province: f.province,
      postalCode: f.postalCode,
    }).catch((err) => console.error("[checkout] couldn't save address", err));
  }

  updateTag(CATALOG_TAG);
  redirect(checkout ? checkout.url : viewUrl);
}

/** Start a new Safepay attempt for an unpaid card order (after a cancelled/failed attempt). */
export async function retryPayment(orderNumber, token) {
  const rl = await rateLimit("checkout", LIMITS.checkout);
  if (!rl.ok) return { ok: false, message: "Too many attempts. Please wait a few minutes." };
  const order = await getOrderForViewer(orderNumber, token);
  if (!order || order.paymentMethod !== "CARD" || order.paymentStatus === "PAID" || order.status !== "PENDING") {
    return { ok: false, message: "This order can't be paid online." };
  }
  if (!(await safepayConfigured())) return { ok: false, message: "Card payments are not available right now." };

  let checkout;
  try {
    checkout = await createCheckout({
      amount: order.grandTotal,
      orderNumber,
      redirectUrl: `${appUrl()}/checkout/safepay/return?order=${orderNumber}&t=${token}`,
      cancelUrl: `${appUrl()}/checkout/safepay/cancel?order=${orderNumber}&t=${token}`,
    });
  } catch (e) {
    console.error("[checkout] Safepay retry failed", e);
    return { ok: false, message: "We couldn't start the card payment. Please try again shortly." };
  }
  const attempts = await db.payment.count({ where: { orderId: order.id } });
  await db.$transaction([
    db.payment.updateMany({
      where: { orderId: order.id, status: { in: ["INITIATED", "PENDING"] } },
      data: { status: "CANCELLED" },
    }),
    db.payment.create({
      data: {
        orderId: order.id,
        provider: "SAFEPAY",
        method: "CARD",
        amount: order.grandTotal,
        status: "PENDING",
        merchantRef: `${orderNumber}-${attempts + 1}`,
        providerPaymentId: checkout.tracker,
      },
    }),
  ]);
  redirect(checkout.url);
}
