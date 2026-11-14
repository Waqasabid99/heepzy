import "server-only";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { toPlain } from "@/lib/serialize";

/** Admin voucher reads. Uncached; every function re-checks the admin role. */
export const COUPON_PAGE_SIZE = 25;
export const COUPON_STATES = ["active", "scheduled", "ended", "off"];

export const COUPON_STATE_LABELS = {
  active: "Active",
  scheduled: "Scheduled",
  ended: "Ended",
  usedUp: "Used up",
  off: "Off",
};

/** Where a voucher stands right now. */
export function couponState(c, now = new Date()) {
  if (!c.isActive) return "off";
  if (c.startsAt && new Date(c.startsAt) > now) return "scheduled";
  if (c.endsAt && new Date(c.endsAt) <= now) return "ended";
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return "usedUp";
  return "active";
}

export function describeDiscount(c) {
  const v = Number(c.value);
  if (c.type === "FREE_SHIPPING") return "Free delivery";
  if (c.type === "PERCENTAGE") {
    return `${v}% off${c.maxDiscountAmount ? ` (up to Rs ${Number(c.maxDiscountAmount).toLocaleString("en-PK")})` : ""}`;
  }
  return `Rs ${v.toLocaleString("en-PK")} off`;
}

export function parseCouponListParams(sp = {}) {
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const q = (one(sp.q) ?? "").toString().trim().slice(0, 60);
  const state = COUPON_STATES.includes(one(sp.state)) ? one(sp.state) : null;
  const page = Math.max(1, Math.min(Number.parseInt(one(sp.page), 10) || 1, 1000));
  return { q, state, page };
}

function stateWhere(state, now) {
  const started = { OR: [{ startsAt: null }, { startsAt: { lte: now } }] };
  const notEnded = { OR: [{ endsAt: null }, { endsAt: { gt: now } }] };
  if (state === "active") return { isActive: true, AND: [started, notEnded] };
  if (state === "scheduled") return { isActive: true, startsAt: { gt: now } };
  if (state === "ended") return { isActive: true, endsAt: { lte: now } };
  if (state === "off") return { isActive: false };
  return {};
}

export async function listCoupons({ q, state, page }) {
  await requireStaff();
  const now = new Date();
  const where = {
    ...stateWhere(state, now),
    ...(q ? { OR: [{ code: { contains: q.toUpperCase() } }, { description: { contains: q } }] } : {}),
  };
  const [total, rows, counts] = await Promise.all([
    db.coupon.count({ where }),
    db.coupon.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * COUPON_PAGE_SIZE,
      take: COUPON_PAGE_SIZE,
      include: { _count: { select: { products: true, categories: true, brands: true } } },
    }),
    Promise.all([null, ...COUPON_STATES].map((s) => db.coupon.count({ where: stateWhere(s, now) }))),
  ]);
  const sums = rows.length
    ? await db.couponRedemption.groupBy({
        by: ["couponId"],
        where: { couponId: { in: rows.map((r) => r.id) } },
        _sum: { amount: true },
      })
    : [];
  const given = new Map(sums.map((s) => [s.couponId, Number(s._sum.amount ?? 0)]));

  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / COUPON_PAGE_SIZE)),
    counts: Object.fromEntries([null, ...COUPON_STATES].map((s, i) => [s ?? "all", counts[i]])),
    coupons: toPlain(rows).map((c) => ({
      ...c,
      state: couponState(c, now),
      discount: describeDiscount(c),
      given: given.get(c.id) ?? 0,
    })),
  };
}

export async function getCoupon(id) {
  await requireStaff();
  if (typeof id !== "string" || id.length > 40) return null;
  const c = await db.coupon.findUnique({
    where: { id },
    include: {
      products: { select: { id: true } },
      categories: { select: { id: true } },
      brands: { select: { id: true } },
    },
  });
  if (!c) return null;
  const [redemptions, totals] = await Promise.all([
    db.couponRedemption.findMany({
      where: { couponId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        email: true,
        amount: true,
        createdAt: true,
        order: { select: { id: true, orderNumber: true, grandTotal: true, status: true } },
      },
    }),
    db.couponRedemption.aggregate({ where: { couponId: id }, _sum: { amount: true }, _count: { _all: true } }),
  ]);
  const plain = toPlain(c);
  return {
    ...plain,
    state: couponState(plain),
    discount: describeDiscount(plain),
    productIds: plain.products.map((x) => x.id),
    categoryIds: plain.categories.map((x) => x.id),
    brandIds: plain.brands.map((x) => x.id),
    redemptions: toPlain(redemptions),
    redeemed: totals._count._all,
    given: Number(totals._sum.amount ?? 0),
  };
}
