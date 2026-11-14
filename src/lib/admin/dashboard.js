import "server-only";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { getInventoryStats } from "@/lib/admin/inventory";

/**
 * Numbers for the admin dashboard. Days are Pakistan days (UTC+5).
 *
 * An order counts as a sale unless it was cancelled, or it's an online
 * payment that never went through (abandoned/failed card checkout).
 * Sales are net of refunds.
 */
export const RANGES = { today: 1, "7d": 7, "30d": 30 };
export const RANGE_LABELS = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days" };

const DAY = 86_400_000;
const PKT = 5 * 3_600_000;
/** Start of the PKT day containing `t` (as a UTC Date). */
const pktDayStart = (t) => new Date(Math.floor((t + PKT) / DAY) * DAY - PKT);
const pktKey = (d) => new Date(d.getTime() + PKT).toISOString().slice(0, 10);

const counted = {
  status: { not: "CANCELLED" },
  OR: [
    { paymentMethod: { in: ["COD", "MANUAL"] } },
    { paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } },
  ],
};

export function parseRange(sp = {}) {
  return Object.hasOwn(RANGES, sp.range) ? sp.range : "7d";
}

function summarise(orders) {
  let sales = 0;
  for (const o of orders) sales += Number(o.grandTotal) - Number(o.refundedTotal);
  return { sales, orders: orders.length, average: orders.length ? sales / orders.length : 0 };
}

export async function getDashboard(range) {
  await requireStaff();
  const days = RANGES[range];
  const now = Date.now();
  const start = new Date(pktDayStart(now).getTime() - (days - 1) * DAY);
  const prevStart = new Date(start.getTime() - days * DAY);
  // Chart: at least 7 days so "today" still shows a trend.
  const chartDays = Math.max(days, 7);
  const chartStart = new Date(pktDayStart(now).getTime() - (chartDays - 1) * DAY);
  const since = new Date(Math.min(prevStart.getTime(), chartStart.getTime()));

  const [orders, attention, inventory, recent, top] = await Promise.all([
    db.order.findMany({
      where: { ...counted, placedAt: { gte: since } },
      select: { placedAt: true, grandTotal: true, refundedTotal: true, paymentMethod: true },
    }),
    Promise.all([
      db.order.count({ where: { ...counted, status: "PENDING" } }),
      db.order.count({ where: { status: { in: ["CONFIRMED", "PROCESSING"] } } }),
      db.order.count({ where: { status: "SHIPPED" } }),
      db.returnRequest.count({ where: { status: "REQUESTED" } }),
      db.returnRequest.count({ where: { status: "APPROVED" } }),
      db.review.count({ where: { status: "PENDING" } }),
      db.outboundMessage.count({ where: { status: "PENDING" } }),
    ]),
    getInventoryStats(),
    db.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        shipFullName: true,
        shipCity: true,
        grandTotal: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        placedAt: true,
      },
    }),
    db.orderItem.groupBy({
      by: ["productId", "productName"],
      where: { order: { ...counted, placedAt: { gte: start } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const current = orders.filter((o) => o.placedAt >= start);
  const previous = orders.filter((o) => o.placedAt >= prevStart && o.placedAt < start);
  const now$ = summarise(current);
  const prev$ = summarise(previous);
  const change = (a, b) => (b > 0 ? (a - b) / b : null);

  const byDay = new Map();
  for (let i = 0; i < chartDays; i++) byDay.set(pktKey(new Date(chartStart.getTime() + i * DAY)), 0);
  for (const o of orders) {
    const k = pktKey(o.placedAt);
    if (byDay.has(k)) byDay.set(k, byDay.get(k) + Number(o.grandTotal) - Number(o.refundedTotal));
  }

  const cod = current.filter((o) => o.paymentMethod === "COD").length;
  const [pending, toPack, shipped, newReturns, returnsToReceive, reviews, messages] = attention;

  return {
    range,
    kpis: {
      sales: { value: now$.sales, change: change(now$.sales, prev$.sales) },
      orders: { value: now$.orders, change: change(now$.orders, prev$.orders) },
      average: { value: now$.average, change: change(now$.average, prev$.average) },
      codShare: current.length ? cod / current.length : null,
    },
    chart: [...byDay].map(([date, sales]) => ({ date, sales })),
    attention: { pending, toPack, shipped, newReturns, returnsToReceive, reviews, messages },
    stock: { low: inventory.lowCount, out: inventory.outCount },
    recent: recent.map((o) => ({ ...o, grandTotal: Number(o.grandTotal), placedAt: o.placedAt.toISOString() })),
    top: top.map((t) => ({
      productId: t.productId,
      name: t.productName,
      quantity: t._sum.quantity ?? 0,
      revenue: Number(t._sum.lineTotal ?? 0),
    })),
  };
}
