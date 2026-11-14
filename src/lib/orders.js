import "server-only";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hashToken } from "@/lib/checkout";
import { fetchTracker, toPaisa } from "@/lib/payments/safepay";
import { getCurrentUser } from "@/lib/session";
import { toPlain } from "@/lib/serialize";

export const ORDER_STATUS_LABELS = {
  PENDING: "Placed",
  CONFIRMED: "Confirmed",
  PROCESSING: "Packing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};
export const PAYMENT_STATUS_LABELS = {
  UNPAID: "Unpaid",
  PENDING: "Awaiting payment",
  PAID: "Paid",
  FAILED: "Payment failed",
  PARTIALLY_REFUNDED: "Partly refunded",
  REFUNDED: "Refunded",
};
export const PAYMENT_METHOD_LABELS = { COD: "Cash on delivery", CARD: "Card / wallet (Safepay)", WALLET: "Wallet" };

/**
 * Confirm a Safepay payment by asking Safepay for the tracker's real state.
 * Idempotent: safe to call from the redirect and the webhook at the same time.
 * Returns { status: "paid" | "unpaid" | "mismatch" | "unknown", order? }.
 */
export async function settleSafepayPayment(tracker, source) {
  const payment = await db.payment.findUnique({
    where: { providerPaymentId: String(tracker ?? "") },
    include: { order: { select: { id: true, orderNumber: true, status: true } } },
  });
  if (!payment || payment.provider !== "SAFEPAY") return { status: "unknown" };
  if (payment.status === "COMPLETED") return { status: "paid", order: payment.order };

  const t = await fetchTracker(payment.providerPaymentId);
  if (!t) return { status: "unknown", order: payment.order };
  if (!t.paid) return { status: "unpaid", state: t.state, order: payment.order };

  if (
    t.amountPaisa !== toPaisa(payment.amount) ||
    t.orderNumber !== payment.order.orderNumber ||
    t.currency !== "PKR"
  ) {
    await db.payment.update({
      where: { id: payment.id },
      data: { failureReason: "Amount/order mismatch reported by Safepay", providerResponse: t },
    });
    await audit({
      action: "payment.mismatch",
      entity: "Order",
      entityId: payment.orderId,
      metadata: { tracker: t.tracker, expected: toPaisa(payment.amount), got: t.amountPaisa, source },
    });
    return { status: "mismatch", order: payment.order };
  }

  const settled = await db.$transaction(async (tx) => {
    // Conditional update = only one caller (redirect or webhook) wins.
    const res = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "COMPLETED" } },
      data: { status: "COMPLETED", providerResponse: t, failureReason: null },
    });
    if (res.count === 0) return false;
    const order = await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: "PAID",
        ...(payment.order.status === "PENDING" ? { status: "CONFIRMED", confirmedAt: new Date() } : {}),
      },
      select: { status: true },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: payment.orderId,
        status: order.status,
        note: `Payment of Rs ${Number(payment.amount).toLocaleString("en-PK")} received via Safepay`,
      },
    });
    return true;
  });
  if (settled) {
    await audit({ action: "payment.completed", entity: "Order", entityId: payment.orderId, metadata: { source } });
  }
  return { status: "paid", order: payment.order };
}

/**
 * Load an order for the customer: the signed-in owner, or a guest holding the
 * access token from their confirmation link. Returns null otherwise.
 */
export async function getOrderForViewer(orderNumber, token) {
  if (!/^HZ-[0-9A-Z-]{4,16}$/.test(String(orderNumber))) return null;
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) return null;

  let allowed = false;
  if (token && order.accessTokenHash) {
    const a = Buffer.from(hashToken(token));
    const b = Buffer.from(order.accessTokenHash);
    allowed = a.length === b.length && timingSafeEqual(a, b);
  }
  if (!allowed && order.userId) {
    const user = await getCurrentUser();
    allowed = user?.id === order.userId;
  }
  return allowed ? toPlain(order) : null;
}

/**
 * Cancel an order and put its stock back (CANCELLATION movements).
 * Used by admins and for abandoned card payments.
 */
export async function cancelOrderAndRestock(orderId, { actorId = null, note } = {}) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || ["CANCELLED", "SHIPPED", "DELIVERED", "RETURNED"].includes(order.status)) return false;
    const res = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (res.count === 0) return false;
    for (const item of order.items) {
      if (!item.variantId) continue;
      const v = await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
        select: { stock: true },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: item.variantId,
          change: item.quantity,
          stockAfter: v.stock,
          reason: "CANCELLATION",
          orderId,
          actorId,
          note: `Order ${order.orderNumber} cancelled`,
        },
      });
    }
    if (order.couponCode) {
      const redemption = await tx.couponRedemption.findUnique({ where: { orderId } });
      if (redemption) {
        await tx.couponRedemption.delete({ where: { orderId } });
        await tx.coupon.update({ where: { id: redemption.couponId }, data: { usedCount: { decrement: 1 } } });
      }
    }
    await tx.payment.updateMany({
      where: { orderId, status: { in: ["INITIATED", "PENDING"] } },
      data: { status: "CANCELLED" },
    });
    await tx.orderStatusHistory.create({
      data: { orderId, status: "CANCELLED", note: note ?? "Order cancelled", actorId },
    });
    return true;
  });
}
