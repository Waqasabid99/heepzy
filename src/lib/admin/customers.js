import "server-only";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { toPlain } from "@/lib/serialize";
import { STAFF_ROLES } from "@/lib/roles";

/** Admin customer reads. Uncached; every function re-checks the admin role. */
export const CUSTOMER_PAGE_SIZE = 25;
// null = everyone (accounts and guest checkouts). "registered" = accounts only.
export const CUSTOMER_FILTERS = ["registered", "buyers", "none", "guests", "banned", "staff"];
const MAX_MERGED = 5000;

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

/** Distinct guest buyers (checked out without an account), one per email. */
function guestWhere(q) {
  return {
    userId: null,
    ...(q
      ? {
          OR: [
            { email: { contains: q.toLowerCase() } },
            { phone: { contains: q.replace(/\D/g, "") || q } },
            { shipFullName: { contains: q } },
          ],
        }
      : {}),
  };
}

// Guests are grouped by phone: it is required at checkout (the WhatsApp number), email isn't always given.
async function countGuests(q = "") {
  const groups = await db.order.groupBy({ by: ["phone"], where: guestWhere(q) });
  return groups.length;
}

async function listGuests({ q, page, size = CUSTOMER_PAGE_SIZE }) {
  const all = await db.order.groupBy({
    by: ["phone"],
    where: guestWhere(q),
    _max: { placedAt: true },
    orderBy: { _max: { placedAt: "desc" } },
  });
  const slice = all.slice((page - 1) * size, page * size).map((g) => g.phone);
  const [counted, orders] = slice.length
    ? await Promise.all([
        db.order.groupBy({
          by: ["phone"],
          where: { userId: null, phone: { in: slice }, ...countedOrders },
          _sum: { grandTotal: true },
        }),
        db.order.findMany({
          where: { userId: null, phone: { in: slice } },
          orderBy: { placedAt: "desc" },
          select: { email: true, phone: true, shipFullName: true, shipCity: true, placedAt: true, status: true },
        }),
      ])
    : [[], []];
  const spentBy = new Map(counted.map((s) => [s.phone, Number(s._sum.grandTotal ?? 0)]));
  const byPhone = new Map();
  for (const o of orders) {
    const g = byPhone.get(o.phone) ?? { latest: o, email: "", total: 0, cancelled: 0 };
    if (!g.email && o.email) g.email = o.email;
    g.total += 1;
    if (o.status === "CANCELLED") g.cancelled += 1;
    byPhone.set(o.phone, g);
  }
  const emails = [...byPhone.values()].map((g) => g.email).filter(Boolean);
  const accounts = await db.user.findMany({
    where: { OR: [{ phone: { in: slice } }, ...(emails.length ? [{ email: { in: emails } }] : [])] },
    select: { id: true, email: true, phone: true },
  });
  const accountFor = (phone, email) => accounts.find((a) => a.phone === phone || (email && a.email === email))?.id ?? null;

  return {
    total: all.length,
    customers: slice.map((phone) => {
      const g = byPhone.get(phone);
      return {
        id: `guest:${phone}`,
        guest: true,
        accountId: accountFor(phone, g?.email),
        name: g?.latest.shipFullName ?? "",
        email: g?.email ?? "",
        phone,
        city: g?.latest.shipCity ?? "",
        createdAt: g?.latest.placedAt.toISOString() ?? null,
        orders: g?.total ?? 0,
        cancelled: g?.cancelled ?? 0,
        spent: spentBy.get(phone) ?? 0,
        lastOrderAt: g?.latest.placedAt.toISOString() ?? null,
      };
    }),
  };
}

/** Registered accounts with their order stats. */
async function userRows(where, { skip = 0, take = CUSTOMER_PAGE_SIZE } = {}) {
  const rows = await db.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    skip,
    take,
    select: { id: true, name: true, email: true, phone: true, role: true, banned: true, createdAt: true },
  });
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
  return rows.map((u) => {
    const s = byUser.get(u.id);
    return {
      ...u,
      createdAt: u.createdAt.toISOString(),
      orders: s?._count._all ?? 0,
      spent: Number(s?._sum.grandTotal ?? 0),
      lastOrderAt: s?._max.placedAt?.toISOString() ?? null,
    };
  });
}

/** Guests who never made an account (those who did are listed as their account). */
async function guestOnlyRows(q) {
  const { customers } = await listGuests({ q, page: 1, size: MAX_MERGED });
  return customers.filter((c) => !c.accountId);
}

export async function listCustomers({ q, filter, page }) {
  await requireStaff();
  const pageOf = (total) => Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE));

  const counts = await (async () => {
    const userFilters = ["registered", "buyers", "none", "banned", "staff"];
    const [userCounts, guests, guestOnly] = await Promise.all([
      Promise.all(userFilters.map((f) => db.user.count({ where: whereFor(f, "") }))),
      countGuests(),
      guestOnlyRows(""),
    ]);
    const c = Object.fromEntries(userFilters.map((f, i) => [f, userCounts[i]]));
    return { ...c, guests, all: c.registered + guestOnly.length };
  })();

  if (filter === "guests") {
    const { total, customers } = await listGuests({ q, page });
    return { total, page, pageCount: pageOf(total), counts, customers };
  }

  if (!filter) {
    // Everyone, most recently active first (last order, or sign-up date if they haven't ordered).
    const [users, guests] = await Promise.all([
      userRows(whereFor("registered", q), { take: MAX_MERGED }),
      guestOnlyRows(q),
    ]);
    const active = (c) => c.lastOrderAt ?? c.createdAt ?? "";
    const merged = [...users, ...guests].sort((x, y) => active(y).localeCompare(active(x)));
    const start = (page - 1) * CUSTOMER_PAGE_SIZE;
    return {
      total: merged.length,
      page,
      pageCount: pageOf(merged.length),
      counts,
      customers: merged.slice(start, start + CUSTOMER_PAGE_SIZE),
    };
  }

  const where = whereFor(filter, q);
  const [total, customers] = await Promise.all([
    db.user.count({ where }),
    userRows(where, { skip: (page - 1) * CUSTOMER_PAGE_SIZE }),
  ]);
  return { total, page, pageCount: pageOf(total), counts, customers };
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
