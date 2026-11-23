import "server-only";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { toPlain } from "@/lib/serialize";

export const ORDERS_PAGE_SIZE = 25;
export const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];

/** Which status an admin can move an order to next. */
export const NEXT_STATUSES = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: [],
};

const one = (v) => (Array.isArray(v) ? v[0] : v);

export function parseOrderListParams(sp = {}) {
  const status = ORDER_STATUSES.includes(one(sp.status)) ? one(sp.status) : null;
  const payment = ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED"].includes(one(sp.payment))
    ? one(sp.payment)
    : null;
  const method = ["COD", "CARD", "MANUAL", "WHATSAPP"].includes(one(sp.method)) ? one(sp.method) : null;
  return {
    q: (one(sp.q) ?? "").toString().trim().slice(0, 100),
    status,
    payment,
    method,
    page: Math.max(1, Math.min(Number.parseInt(one(sp.page), 10) || 1, 1000)),
  };
}

export async function listAdminOrders({ q, status, payment, method, page }) {
  await requireStaff();
  const search = q
    ? {
        OR: [
          { orderNumber: { contains: q.toUpperCase() } },
          { email: { contains: q.toLowerCase() } },
          { phone: { contains: q.replace(/\D/g, "") || q } },
          { shipFullName: { contains: q } },
        ],
      }
    : {};
  const where = {
    ...search,
    ...(status ? { status } : {}),
    ...(payment ? { paymentStatus: payment } : {}),
    ...(method ? { paymentMethod: method } : {}),
  };

  const [total, rows, counts] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: [{ placedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        placedAt: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        grandTotal: true,
        shipFullName: true,
        shipCity: true,
        email: true,
        _count: { select: { items: true } },
        items: { select: { quantity: true } },
      },
    }),
    db.order.groupBy({ by: ["status"], where: search, _count: { _all: true } }),
  ]);

  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)),
    counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    orders: rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      placedAt: o.placedAt.toISOString(),
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      total: Number(o.grandTotal),
      customer: o.shipFullName,
      city: o.shipCity,
      email: o.email,
      pairs: o.items.reduce((n, i) => n + i.quantity, 0),
    })),
  };
}

export async function getAdminOrder(id) {
  await requireStaff();
  if (typeof id !== "string" || id.length > 40) return null;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { id: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      user: { select: { id: true, name: true, email: true } },
      refunds: { orderBy: { createdAt: "desc" } },
      returnRequests: {
        orderBy: { createdAt: "desc" },
        select: { id: true, rmaNumber: true, status: true, resolution: true, createdAt: true },
      },
    },
  });
  if (!order) return null;

  const actorIds = [...new Set(order.statusHistory.map((h) => h.actorId).filter(Boolean))];
  const actors = actorIds.length
    ? await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } })
    : [];
  const names = new Map(actors.map((a) => [a.id, a.name || a.email]));
  // Orders without an email (taken by phone) are matched on the phone number instead.
  const previousOrders = await db.order.count({
    where: { ...(order.email ? { email: order.email } : { phone: order.phone }), id: { not: order.id } },
  });

  const plain = toPlain(order);
  return {
    ...plain,
    statusHistory: plain.statusHistory.map((h) => ({
      ...h,
      actor: h.actorId ? (names.get(h.actorId) ?? "Admin") : "System",
    })),
    payments: plain.payments.map(({ providerResponse, ...p }) => ({
      ...p,
      providerState: providerResponse?.state ?? null,
    })),
    previousOrders,
  };
}
