import "server-only";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { toPlain } from "@/lib/serialize";
import { round2 } from "@/lib/checkout";
import { refundable } from "@/lib/returns";

export const RETURN_STATUSES = ["REQUESTED", "APPROVED", "RECEIVED", "COMPLETED", "REJECTED", "CANCELLED"];
const PAGE_SIZE = 25;

export function parseReturnListParams(sp = {}) {
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const status = RETURN_STATUSES.includes(one(sp.status)) ? one(sp.status) : null;
  const q = (one(sp.q) ?? "").toString().trim().slice(0, 60);
  const page = Math.max(1, Math.min(Number.parseInt(one(sp.page), 10) || 1, 1000));
  return { status, q, page };
}

export async function listReturns({ status, q, page }) {
  await requireStaff();
  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { rmaNumber: { contains: q.toUpperCase() } },
            { order: { orderNumber: { contains: q.toUpperCase() } } },
            { order: { shipFullName: { contains: q } } },
            { order: { phone: { contains: q.replace(/\s/g, "") } } },
          ],
        }
      : {}),
  };
  const [total, rows, grouped] = await Promise.all([
    db.returnRequest.count({ where }),
    db.returnRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        rmaNumber: true,
        status: true,
        reason: true,
        resolution: true,
        createdAt: true,
        order: { select: { id: true, orderNumber: true, shipFullName: true, shipCity: true } },
        items: { select: { quantity: true } },
      },
    }),
    db.returnRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    counts,
    returns: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      pairs: r.items.reduce((n, i) => n + i.quantity, 0),
    })),
  };
}

export async function getReturn(id) {
  await requireStaff();
  if (typeof id !== "string" || id.length > 40) return null;
  const r = await db.returnRequest.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          orderItem: {
            select: {
              id: true,
              productName: true,
              color: true,
              size: true,
              sku: true,
              imageUrl: true,
              unitPrice: true,
              quantity: true,
              returnedQty: true,
              variantId: true,
            },
          },
        },
      },
      refunds: { orderBy: { createdAt: "desc" } },
      order: {
        select: {
          id: true,
          orderNumber: true,
          email: true,
          phone: true,
          shipFullName: true,
          shipLine1: true,
          shipLine2: true,
          shipCity: true,
          shipProvince: true,
          shipPhone: true,
          paymentMethod: true,
          paymentStatus: true,
          subtotal: true,
          discountTotal: true,
          grandTotal: true,
          refundedTotal: true,
          deliveredAt: true,
          userId: true,
        },
      },
    },
  });
  if (!r) return null;
  const history = await db.auditLog.findMany({
    where: { entity: "ReturnRequest", entityId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, action: true, metadata: true, createdAt: true, actor: { select: { name: true } } },
  });
  const plain = toPlain(r);
  // Suggested refund: the items' price less their share of any order discount (delivery not included).
  const itemsValue = plain.items.reduce((n, i) => n + Number(i.orderItem.unitPrice) * i.quantity, 0);
  const discountShare = Number(plain.order.subtotal)
    ? Number(plain.order.discountTotal) / Number(plain.order.subtotal)
    : 0;
  const left = refundable(plain.order);
  return {
    ...plain,
    suggestedRefund: Math.min(left, round2(itemsValue * (1 - discountShare))),
    refundableLeft: left,
    history: toPlain(history),
  };
}
