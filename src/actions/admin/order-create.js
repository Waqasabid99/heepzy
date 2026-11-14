"use server";

import { queueOrderMessage } from "@/lib/messages";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { getStoreSettings } from "@/lib/settings";
import { CATALOG_TAG } from "@/lib/catalog";
import { hashToken, newAccessToken, nextOrderNumber, PROVINCES, quote } from "@/lib/checkout";
import { createOrder } from "@/lib/orders";
import { safepayConfigured } from "@/lib/payments/safepay";
import { normalizePhone } from "@/lib/phone";
import { canonicalCity } from "@/lib/pk-cities";
import { PAID_VIA } from "@/lib/order-options";
import { buildLines, getCustomerForOrder, searchCustomers, searchProducts } from "@/lib/admin/order-create";

const appUrl = () => env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

export async function findCustomers(q) {
  return searchCustomers(q);
}
export async function loadCustomer(id) {
  return getCustomerForOrder(id);
}
export async function findProducts(q) {
  return searchProducts(q);
}

const items = z
  .array(z.object({ variantId: z.string().min(10).max(40), quantity: z.coerce.number().int().min(1).max(50) }))
  .max(40);

/** Merge duplicate sizes into one line each. */
function mergeItems(list) {
  const m = new Map();
  for (const i of list) m.set(i.variantId, (m.get(i.variantId) ?? 0) + i.quantity);
  return [...m].map(([variantId, quantity]) => ({ variantId, quantity }));
}

const money = z.union([
  z.literal(""),
  z
    .string()
    .trim()
    .regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter an amount like 500"),
]);

const quoteSchema = z.object({
  customerId: z.string().max(64).default(""),
  email: z.string().trim().max(191).default(""),
  items,
  city: z.string().trim().max(80).default(""),
  province: z.string().default(""),
  rateId: z.string().max(40).default(""),
  payment: z.enum(["COD", "MANUAL", "CARD_LINK"]).default("COD"),
  couponCode: z.string().trim().max(40).default(""),
  extraDiscount: money.default(""),
});

const methodFor = (payment) => (payment === "CARD_LINK" ? "CARD" : payment);

/** Live totals for the admin order form. */
export async function adminQuote(input) {
  await requireStaff();
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Check the order details." };
  const f = parsed.data;
  const [{ lines, problems }, settings] = await Promise.all([buildLines(mergeItems(f.items)), getStoreSettings()]);
  const province = Object.hasOwn(PROVINCES, f.province) ? f.province : null;
  const q = await quote({
    lines,
    settings,
    city: f.city,
    province,
    rateId: f.rateId,
    paymentMethod: methodFor(f.payment),
    couponCode: f.couponCode,
    email: f.email,
    userId: f.customerId || undefined,
    extraDiscount: f.extraDiscount || 0,
  });
  return {
    ok: true,
    problems,
    lines: lines.map((l) => ({
      variantId: l.variantId,
      unitPrice: l.unitPrice,
      compareAt: l.compareAt,
      lineTotal: l.lineTotal,
      stock: l.stock,
    })),
    quote: {
      subtotal: q.subtotal,
      couponDiscount: q.couponDiscount,
      extraDiscount: q.extraDiscount,
      coupon: q.coupon,
      couponMessage: q.couponMessage,
      rates: q.rates,
      rateId: q.rate?.id ?? null,
      shipping: q.shipping,
      codFee: q.codFee,
      tax: q.tax,
      grandTotal: q.grandTotal,
    },
  };
}

const phone = (msg) =>
  z.string().transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) ctx.addIssue({ code: "custom", message: msg });
    return p ?? "";
  });

const orderSchema = quoteSchema
  .extend({
    name: z.string().trim().max(120).default(""),
    phone: phone("Enter the customer's mobile number, e.g. 0300 1234567"),
    fullName: z.string().trim().min(2, "Enter the recipient's name").max(120),
    shipPhone: phone("Enter a mobile number for delivery"),
    line1: z.string().trim().min(5, "Enter the house/street address").max(255),
    line2: z.string().trim().max(255).default(""),
    city: z.string().trim().min(2, "Choose the city").max(80),
    province: z.enum(Object.keys(PROVINCES), { error: "Choose the province" }),
    postalCode: z.union([z.literal(""), z.string().regex(/^\d{5}$/, "Postal code is 5 digits")]).default(""),
    saveAddress: z.boolean().default(false),
    rateId: z.string().min(1, "Choose a delivery option").max(40),
    paidVia: z.enum(PAID_VIA).default("Bank transfer"),
    paidRef: z.string().trim().max(80).default(""),
    discountReason: z.string().trim().max(200).default(""),
    customerNote: z.string().trim().max(1000).default(""),
    adminNote: z.string().trim().max(2000).default(""),
    status: z.enum(["PENDING", "CONFIRMED"]).default("CONFIRMED"),
  })
  .superRefine((o, ctx) => {
    if (!o.items.length) ctx.addIssue({ code: "custom", path: ["items"], message: "Add at least one item" });
    if (o.email && !z.email().safeParse(o.email).success) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Enter a valid email address" });
    }
    if (!o.customerId && o.name.length < 2) {
      ctx.addIssue({ code: "custom", path: ["name"], message: "Enter the customer's name" });
    }
  });

/** Create an order on behalf of a customer (phone, WhatsApp or walk-in). Redirects to the new order. */
export async function createAdminOrder(input) {
  const admin = await requireStaff();
  const fail = (errors, message = null) => ({ ok: false, errors, message });
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) {
    const errors = {};
    for (const i of parsed.error.issues) errors[i.path[0] ?? "form"] ??= i.message;
    return fail(errors);
  }
  const f = parsed.data;

  let customer = null;
  if (f.customerId) {
    customer = await getCustomerForOrder(f.customerId);
    if (!customer) return fail({ customerId: "This customer can't be found or is blocked" });
  }
  const email = (f.email || customer?.email || "").toLowerCase();
  const city = canonicalCity(f.province, f.city) ?? f.city.replace(/\s+/g, " ");

  if (f.payment === "CARD_LINK" && !(await safepayConfigured())) {
    return fail({ payment: "Card payments aren't set up. Choose another payment option." });
  }

  const [{ lines, problems }, settings] = await Promise.all([buildLines(mergeItems(f.items)), getStoreSettings()]);
  if (problems.length) return fail({ items: problems.join(". ") });

  const q = await quote({
    lines,
    settings,
    city,
    province: f.province,
    rateId: f.rateId,
    paymentMethod: methodFor(f.payment),
    couponCode: f.couponCode,
    email,
    userId: customer?.id,
    extraDiscount: f.extraDiscount || 0,
  });
  if (!q.rate || q.rate.id !== f.rateId)
    return fail({ rateId: "That delivery option isn't available for this address" });
  if (f.couponCode && !q.coupon) return fail({ couponCode: q.couponMessage ?? "That voucher can't be used" });

  const orderNumber = await nextOrderNumber();
  const access = newAccessToken();
  const paymentMethod = methodFor(f.payment);
  const card = f.payment === "CARD_LINK";
  const manual = f.payment === "MANUAL";
  const notes = [
    "Created by admin",
    manual ? `Paid by ${f.paidVia}${f.paidRef ? ` (ref ${f.paidRef})` : ""}` : null,
    q.extraDiscount ? `Extra discount Rs ${q.extraDiscount}${f.discountReason ? `: ${f.discountReason}` : ""}` : null,
  ].filter(Boolean);

  let order;
  try {
    order = await createOrder({
      orderNumber,
      accessHash: access.hash,
      userId: customer?.id ?? null,
      email,
      phone: f.phone,
      ship: {
        fullName: f.fullName,
        phone: f.shipPhone,
        line1: f.line1,
        line2: f.line2,
        city,
        province: f.province,
        postalCode: f.postalCode,
      },
      lines,
      q,
      paymentMethod,
      // A card order waits for the customer to pay via the link.
      orderStatus: card ? "PENDING" : f.status,
      paymentStatus: manual ? "PAID" : card ? "PENDING" : "UNPAID",
      payment: {
        provider: manual ? "MANUAL" : card ? "SAFEPAY" : "COD",
        status: manual ? "COMPLETED" : card ? "PENDING" : "INITIATED",
        providerResponse: manual ? { via: f.paidVia, reference: f.paidRef || null, recordedBy: admin.id } : null,
      },
      customerNote: f.customerNote || null,
      adminNote: f.adminNote || null,
      historyNote: notes.join(". "),
      actorId: admin.id,
    });
  } catch (e) {
    const msg = String(e?.message ?? "");
    if (msg.startsWith("OUT_OF_STOCK:")) return fail({ items: `${msg.slice(13)} just sold out` });
    if (msg === "COUPON_USED") return fail({ couponCode: "This voucher has just been fully used" });
    console.error("[admin orders] create failed", e);
    return fail({}, "Couldn't create the order. Please try again.");
  }

  // Keep the address on the customer's account for next time.
  if (customer && f.saveAddress) {
    await db.address.create({
      data: {
        userId: customer.id,
        label: customer.addresses.length ? "Other" : "Home",
        fullName: f.fullName,
        phone: f.shipPhone,
        line1: f.line1,
        line2: f.line2 || null,
        city,
        province: f.province,
        postalCode: f.postalCode || null,
        isDefault: customer.addresses.length === 0,
      },
    });
  }

  await audit({
    actorId: admin.id,
    action: "order.create",
    entity: "Order",
    entityId: order.id,
    metadata: { orderNumber, payment: f.payment, customerId: customer?.id ?? null, total: q.grandTotal },
  });
  updateTag(CATALOG_TAG); // stock changed
  if (!card && f.status === "CONFIRMED") await queueOrderMessage(order.id, "CONFIRMED");
  redirect(`/admin/orders/${order.id}?created=1`);
}

/**
 * A fresh private link to the customer's order page (where card orders can be
 * paid). Replaces the previous link, so older links stop working.
 */
export async function customerOrderLink(orderId) {
  const admin = await requireStaff();
  if (typeof orderId !== "string" || orderId.length > 40) return { ok: false, message: "Invalid request." };
  const order = await db.order.findUnique({ where: { id: orderId }, select: { orderNumber: true } });
  if (!order) return { ok: false, message: "Order not found." };
  const access = newAccessToken();
  await db.order.update({ where: { id: orderId }, data: { accessTokenHash: hashToken(access.token) } });
  await audit({ actorId: admin.id, action: "order.link", entity: "Order", entityId: orderId });
  return { ok: true, url: `${appUrl()}/checkout/complete/${order.orderNumber}?t=${access.token}` };
}
