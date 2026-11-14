import "server-only";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { toPlain } from "@/lib/serialize";
import { STAFF_ROLES } from "@/lib/roles";

/** Admin customer reads. Uncached; every function re-checks the admin role. */
export const CUSTOMER_PAGE_SIZE = 25;
export const CUSTOMER_FILTERS = ["buyers", "none", "banned", "staff"];

export function parseCustomerListParams(sp = {}) {
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const q = (one(sp.q) ?? "").toString().trim().slice(0, 100);
  const filter = CUSTOMER_FILTERS.includes(one(sp.filter)) ? one(sp.filter) : null;
  const page = Math.max(1, Math.min(Number.parseInt(one(sp.page), 10) || 1, 1000));
  return { q, filter, page };
}

const countedOrders = { status: { not: "CANCELLED" } };

function whereFor(filter, q) {
  return {
    ...(filter === "staff" ? { role: { in: STAFF_ROLES } } : { role: { notIn: STAFF_ROLES } }),
    ...(filter === "banned" ? { banned: true } : {}),
    ...(filter === "buyers" ? { orders: { some: countedOrders } } : {}),
    ...(filter === "none" ? { orders: { none: countedOrders } } : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] } : {}),
  };
}

export async function listCustomers({ q, filter, page }) {
  await requireStaff();
  const where = whereFor(filter, q);
  const [total, rows, counts] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * CUSTOMER_PAGE_SIZE,
      take: CUSTOMER_PAGE_SIZE,
      select: { id: true, name: true, email: true, phone: true, role: true, banned: true, createdAt: true },
    }),
    Promise.all([null, ...CUSTOMER_FILTERS].map((f) => db.user.count({ where: whereFor(f, "") }))),
  ]);

  const stats = rows.length
    ? await db.order.groupBy({
        by: ["userId"],
        where: { userId: { in: rows.map((r) => r.id) }, ...countedOrders },
        _count: { _all: true },
        _sum: { grandTotal: true },
        _max: { placedAt: true },
      })
    : [];
  const byUser = new Map(stats.map((s) => [s.userId, s]));

  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE)),
    counts: Object.fromEntries([null, ...CUSTOMER_FILTERS].map((f, i) => [f ?? "all", counts[i]])),
    customers: rows.map((u) => {
      const s = byUser.get(u.id);
      return {
        ...u,
        createdAt: u.createdAt.toISOString(),
        orders: s?._count._all ?? 0,
        spent: Number(s?._sum.grandTotal ?? 0),
        lastOrderAt: s?._max.placedAt?.toISOString() ?? null,
      };
    }),
  };
}

export async function getCustomer(id) {
  await requireStaff();
  if (typeof id !== "string" || id.length > 64) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      phone: true,
      role: true,
      banned: true,
      banReason: true,
      banExpires: true,
      createdAt: true,
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      sessions: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } },
      _count: { select: { reviews: true, wishlist: true, returnRequests: true, couponUses: true } },
    },
  });
  if (!user) return null;

  // Orders on the account, plus guest orders placed with the same email.
  const mine = { OR: [{ userId: id }, { userId: null, email: user.email }] };
  const [orders, totals, cart] = await Promise.all([
    db.order.findMany({
      where: mine,
      orderBy: { placedAt: "desc" },
      take: 25,
      select: {
        id: true,
        orderNumber: true,
        placedAt: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        grandTotal: true,
        userId: true,
        items: { select: { quantity: true } },
      },
    }),
    db.order.aggregate({
      where: { ...mine, ...countedOrders },
      _count: { _all: true },
      _sum: { grandTotal: true },
      _max: { placedAt: true },
      _min: { placedAt: true },
    }),
    db.cart.findUnique({
      where: { userId: id },
      select: { updatedAt: true, items: { select: { quantity: true } } },
    }),
  ]);

  const count = totals._count._all;
  const spent = Number(totals._sum.grandTotal ?? 0);
  const plain = toPlain(user);
  return {
    ...plain,
    lastSeenAt: plain.sessions[0]?.updatedAt ?? null,
    stats: {
      orders: count,
      spent,
      average: count ? Math.round(spent / count) : 0,
      firstOrderAt: totals._min.placedAt?.toISOString() ?? null,
      lastOrderAt: totals._max.placedAt?.toISOString() ?? null,
    },
    cartPairs: cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0,
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      placedAt: o.placedAt.toISOString(),
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      total: Number(o.grandTotal),
      pairs: o.items.reduce((n, i) => n + i.quantity, 0),
      guest: !o.userId,
    })),
  };
}
