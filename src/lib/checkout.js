import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Checkout pricing: delivery zone/rate, voucher, COD fee, GST and totals.
 * Used both for the live quote shown at checkout and — recomputed from the
 * database — when the order is placed, so the client can never set prices.
 */
export const PROVINCES = {
  PUNJAB: "Punjab",
  SINDH: "Sindh",
  KHYBER_PAKHTUNKHWA: "Khyber Pakhtunkhwa",
  BALOCHISTAN: "Balochistan",
  ISLAMABAD_CAPITAL_TERRITORY: "Islamabad Capital Territory",
  GILGIT_BALTISTAN: "Gilgit-Baltistan",
  AZAD_KASHMIR: "Azad Kashmir",
};

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Most specific active zone: city match → province match → default zone. */
async function findZone(city, province) {
  const zones = await db.deliveryZone.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { rates: { where: { isActive: true }, orderBy: { price: "asc" } } },
  });
  const c = String(city ?? "")
    .trim()
    .toLowerCase();
  const asList = (v) => (Array.isArray(v) ? v : []);
  return (
    zones.find(
      (z) =>
        c &&
        asList(z.cities)
          .map((x) => String(x).toLowerCase())
          .includes(c),
    ) ??
    zones.find((z) => province && asList(z.provinces).includes(province)) ??
    zones.find((z) => z.isDefault) ??
    null
  );
}

/** Delivery choices for a destination and (discounted) order value. */
export async function getDeliveryOptions({ city, province, orderValue, settings }) {
  const zone = await findZone(city, province);
  if (!zone) return [];
  const freeStore =
    settings.freeDeliveryEnabled &&
    settings.freeDeliveryThreshold &&
    orderValue >= Number(settings.freeDeliveryThreshold);
  return zone.rates
    .filter((r) => !r.minOrderAmount || orderValue >= Number(r.minOrderAmount))
    .map((r) => {
      const free = freeStore || (r.freeAboveAmount && orderValue >= Number(r.freeAboveAmount));
      return {
        id: r.id,
        name: r.name,
        zone: zone.name,
        price: free ? 0 : Number(r.price),
        regularPrice: Number(r.price),
        codFee: Number(r.codFee ?? 0),
        eta:
          r.estimatedDaysMin && r.estimatedDaysMax
            ? `${r.estimatedDaysMin}–${r.estimatedDaysMax} working days`
            : r.estimatedDaysMax
              ? `Up to ${r.estimatedDaysMax} working days`
              : null,
      };
    });
}

/**
 * Validate a voucher for these cart lines. Returns { ok, message } or
 * { ok, coupon, discount, freeShipping, eligibleSubtotal }.
 */
export async function evaluateCoupon({ code, lines, email, userId }) {
  const normalized = String(code ?? "")
    .trim()
    .toUpperCase();
  if (!normalized) return { ok: false, message: "Enter a voucher code." };
  if (!/^[A-Z0-9_-]{2,40}$/.test(normalized)) return { ok: false, message: "That voucher code isn't valid." };

  const coupon = await db.coupon.findUnique({
    where: { code: normalized },
    include: {
      products: { select: { id: true } },
      categories: { select: { id: true } },
      brands: { select: { id: true } },
    },
  });
  const now = new Date();
  if (!coupon || !coupon.isActive) return { ok: false, message: "That voucher code isn't valid." };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, message: "This voucher isn't active yet." };
  if (coupon.endsAt && coupon.endsAt < now) return { ok: false, message: "This voucher has expired." };
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, message: "This voucher has been fully used." };
  }

  const who = [{ email: String(email ?? "").toLowerCase() }, ...(userId ? [{ userId }] : [])];
  if (coupon.usageLimitPerUser != null && email) {
    const mine = await db.couponRedemption.count({ where: { couponId: coupon.id, OR: who } });
    if (mine >= coupon.usageLimitPerUser) return { ok: false, message: "You've already used this voucher." };
  }
  if (coupon.firstOrderOnly && email) {
    const previous = await db.order.count({ where: { OR: who, status: { not: "CANCELLED" } } });
    if (previous > 0) return { ok: false, message: "This voucher is for first orders only." };
  }

  const productIds = new Set(coupon.products.map((p) => p.id));
  const categoryIds = new Set(coupon.categories.map((c) => c.id));
  const brandIds = new Set(coupon.brands.map((b) => b.id));
  const eligible = lines.filter(
    (l) =>
      coupon.appliesToAll ||
      productIds.has(l.productId) ||
      (l.brandId && brandIds.has(l.brandId)) ||
      l.categoryIds.some((id) => categoryIds.has(id)),
  );
  const eligibleSubtotal = round2(eligible.reduce((n, l) => n + l.lineTotal, 0));
  if (!eligibleSubtotal) return { ok: false, message: "This voucher doesn't apply to the items in your bag." };
  if (coupon.minOrderAmount && eligibleSubtotal < Number(coupon.minOrderAmount)) {
    return {
      ok: false,
      message: `Spend Rs ${Number(coupon.minOrderAmount).toLocaleString("en-PK")} on eligible items to use this voucher.`,
    };
  }

  let discount = 0;
  if (coupon.type === "PERCENTAGE") discount = (eligibleSubtotal * Number(coupon.value)) / 100;
  if (coupon.type === "FIXED_AMOUNT") discount = Number(coupon.value);
  if (coupon.maxDiscountAmount) discount = Math.min(discount, Number(coupon.maxDiscountAmount));
  discount = round2(Math.min(discount, eligibleSubtotal));

  return {
    ok: true,
    coupon: { id: coupon.id, code: coupon.code, description: coupon.description },
    discount,
    freeShipping: coupon.type === "FREE_SHIPPING",
    eligibleSubtotal,
  };
}

async function taxRateFor(province) {
  const rates = await db.taxRate.findMany({
    where: { isActive: true, OR: [{ province: province ?? undefined }, { province: null }] },
    orderBy: [{ priority: "desc" }],
  });
  const specific = rates.find((r) => r.province && r.province === province);
  const rate = specific ?? rates.find((r) => !r.province);
  return rate ? { name: rate.name, percent: Number(rate.rate) } : null;
}

/**
 * Full quote for the bag. `lines` are available cart lines (from getCart).
 * Never throws for user errors — returns messages instead.
 */
export async function quote({
  lines,
  settings,
  city,
  province,
  rateId,
  paymentMethod,
  couponCode,
  email,
  userId,
  extraDiscount = 0,
}) {
  const subtotal = round2(lines.reduce((n, l) => n + l.lineTotal, 0));

  let coupon = null;
  let couponMessage = null;
  if (couponCode) {
    const res = await evaluateCoupon({ code: couponCode, lines, email, userId });
    if (res.ok) coupon = res;
    else couponMessage = res.message;
  }
  const couponDiscount = coupon?.discount ?? 0;
  // Admin-only manual discount on top of any voucher, never more than what's left.
  const extra = round2(Math.min(Math.max(0, Number(extraDiscount) || 0), subtotal - couponDiscount));
  const discount = round2(couponDiscount + extra);
  const afterDiscount = round2(subtotal - discount);

  const rates =
    city || province ? await getDeliveryOptions({ city, province, orderValue: afterDiscount, settings }) : [];
  const rate = rates.find((r) => r.id === rateId) ?? rates[0] ?? null;
  const shipping = rate ? (coupon?.freeShipping ? 0 : rate.price) : 0;
  const codFee = paymentMethod === "COD" && rate ? rate.codFee : 0;

  const tax = await taxRateFor(province);
  let taxTotal = 0;
  if (tax) {
    taxTotal = settings.pricesIncludeTax
      ? round2((afterDiscount * tax.percent) / (100 + tax.percent))
      : round2((afterDiscount * tax.percent) / 100);
  }
  const grandTotal = round2(afterDiscount + shipping + codFee + (settings.pricesIncludeTax ? 0 : taxTotal));

  const codLimit = settings.codMaxOrderAmount ? Number(settings.codMaxOrderAmount) : null;
  const codAllowed = settings.codEnabled && (!codLimit || grandTotal - codFee <= codLimit);

  return {
    subtotal,
    discount,
    couponDiscount,
    extraDiscount: extra,
    coupon: coupon
      ? { code: coupon.coupon.code, description: coupon.coupon.description, freeShipping: coupon.freeShipping }
      : null,
    couponMessage,
    rates,
    rate,
    shipping,
    codFee,
    tax: tax ? { ...tax, amount: taxTotal, included: settings.pricesIncludeTax } : null,
    taxTotal,
    grandTotal,
    codAllowed,
    codLimit,
  };
}

/** Human-friendly unique order number, e.g. HZ-26-418392. */
export async function nextOrderNumber() {
  const yy = String(new Date().getFullYear()).slice(-2);
  for (let i = 0; i < 8; i += 1) {
    const candidate = `HZ-${yy}-${randomInt(100000, 1000000)}`;
    if (!(await db.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } }))) return candidate;
  }
  return `HZ-${yy}-${Date.now().toString(36).toUpperCase()}`;
}

/** Secret for guest order access; only its hash is stored on the order. */
export function newAccessToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}
export function hashToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}
