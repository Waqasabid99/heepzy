import "server-only";
import { isOrderLinkToken } from "@/lib/order-link";
import { queueOrderMessage } from "@/lib/messages";
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
export const PAYMENT_METHOD_LABELS = {
  COD: "Cash on delivery",
  CARD: "Card / wallet (Safepay)",
  WALLET: "Wallet",
  MANUAL: "Paid offline",
};

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
    if (res.count === 0) return null;
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
    return order.status;
  });
  if (settled) {
    await audit({ action: "payment.completed", entity: "Order", entityId: payment.orderId, metadata: { source } });
    if (settled === "CONFIRMED") await queueOrderMessage(payment.orderId, "CONFIRMED");
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

  let allowed = isOrderLinkToken(order.orderNumber, token);
  if (!allowed && token && order.accessTokenHash) {
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

/**
 * Create an order in one transaction: order + items + history + payment,
 * atomic stock reservation (SALE movements), voucher redemption, and
 * optionally clearing a cart. Shared by checkout and admin-created orders.
 *
 * Throws Error("OUT_OF_STOCK:<item>") or Error("COUPON_USED"); callers turn
 * those into messages. Returns { id }.
 */
export async function createOrder({
  orderNumber,
  accessHash,
  userId = null,
  email,
  phone,
  ship,
  lines,
  q,
  paymentMethod,
  orderStatus = "PENDING",
  paymentStatus,
  payment,
  customerNote = null,
  adminNote = null,
  historyNote = "Order placed",
  actorId = null,
  ipAddress = null,
  clearCartId = null,
}) {
  const now = new Date();
  return db.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        orderNumber,
        userId,
        email,
        phone,
        status: orderStatus,
        paymentStatus,
        paymentMethod,
        subtotal: q.subtotal.toFixed(2),
        discountTotal: q.discount.toFixed(2),
        shippingTotal: q.shipping.toFixed(2),
        taxTotal: q.taxTotal.toFixed(2),
        codFee: q.codFee.toFixed(2),
        grandTotal: q.grandTotal.toFixed(2),
        couponCode: q.coupon?.code ?? null,
        deliveryRateName: q.rate ? `${q.rate.name}${q.rate.zone ? ` (${q.rate.zone})` : ""}` : null,
        shipFullName: ship.fullName,
        shipPhone: ship.phone,
        shipLine1: ship.line1,
        shipLine2: ship.line2 || null,
        shipCity: ship.city,
        shipProvince: ship.province,
        shipPostalCode: ship.postalCode || null,
        customerNote,
        adminNote,
        accessTokenHash: accessHash,
        ipAddress,
        ...(orderStatus === "CONFIRMED" ? { confirmedAt: now } : {}),
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            productName: l.name,
            sku: l.sku,
            color: l.color,
            size: l.size,
            imageUrl: l.image?.url ?? null,
            unitPrice: l.unitPrice.toFixed(2),
            quantity: l.quantity,
            lineTotal: l.lineTotal.toFixed(2),
          })),
        },
        statusHistory: { create: { status: orderStatus, note: historyNote, actorId } },
        payments: {
          create: {
            provider: payment.provider,
            method: paymentMethod,
            amount: q.grandTotal.toFixed(2),
            status: payment.status,
            merchantRef: `${orderNumber}-1`,
            providerPaymentId: payment.providerPaymentId ?? null,
            ...(payment.providerResponse ? { providerResponse: payment.providerResponse } : {}),
          },
        },
      },
      select: { id: true },
    });

    // Reserve stock atomically; fails if someone else bought the last pair.
    for (const l of lines) {
      const res = await tx.productVariant.updateMany({
        where: { id: l.variantId, isActive: true, stock: { gte: l.quantity } },
        data: { stock: { decrement: l.quantity } },
      });
      if (res.count === 0) throw new Error(`OUT_OF_STOCK:${l.name} (${l.color}, ${l.size})`);
      const v = await tx.productVariant.findUnique({ where: { id: l.variantId }, select: { stock: true } });
      await tx.inventoryMovement.create({
        data: {
          variantId: l.variantId,
          change: -l.quantity,
          stockAfter: v.stock,
          reason: "SALE",
          orderId: order.id,
          actorId,
          note: `Order ${orderNumber}`,
        },
      });
    }

    if (q.coupon) {
      const coupon = await tx.coupon.findUnique({ where: { code: q.coupon.code }, select: { id: true } });
      const res = await tx.coupon.updateMany({
        where: { id: coupon.id, OR: [{ usageLimit: null }, { usedCount: { lt: db.coupon.fields.usageLimit } }] },
        data: { usedCount: { increment: 1 } },
      });
      if (res.count === 0) throw new Error("COUPON_USED");
      await tx.couponRedemption.create({
        data: { couponId: coupon.id, orderId: order.id, userId, email, amount: q.couponDiscount.toFixed(2) },
      });
    }

    if (clearCartId) await tx.cartItem.deleteMany({ where: { cartId: clearCartId } });
    return order;
  });
}
