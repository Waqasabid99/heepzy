import "server-only";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { round2 } from "@/lib/checkout";

/**
 * Returns, exchanges and refunds: shared rules for the customer pages and
 * the admin. A return is possible on a delivered order, inside the store's
 * return window, for quantities not already returned or in an open request.
 */
export const RETURN_STATUS_LABELS = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  IN_TRANSIT: "On its way back",
  RECEIVED: "Received",
  COMPLETED: "Completed",
  REJECTED: "Not accepted",
  CANCELLED: "Cancelled",
};
export const RETURN_REASON_LABELS = {
  WRONG_SIZE: "Wrong size",
  DEFECTIVE: "Faulty or damaged",
  NOT_AS_DESCRIBED: "Not as described",
  WRONG_ITEM: "Wrong item sent",
  CHANGED_MIND: "Changed my mind",
  OTHER: "Other",
};
export const RESOLUTION_LABELS = { EXCHANGE: "Exchange", REFUND: "Refund", STORE_CREDIT: "Store credit" };
export const REFUND_METHOD_LABELS = {
  ORIGINAL_PAYMENT: "Back to the card (Safepay)",
  BANK_TRANSFER: "Bank transfer",
  WALLET_TRANSFER: "JazzCash / Easypaisa",
  CASH: "Cash",
  STORE_CREDIT: "Store credit",
};
export const OPEN_RETURN = ["REQUESTED", "APPROVED", "IN_TRANSIT", "RECEIVED"];
/** Reasons where photos or an unboxing video are required. */
export const EVIDENCE_REASONS = ["DEFECTIVE", "WRONG_ITEM", "NOT_AS_DESCRIBED"];

const DAY = 24 * 60 * 60 * 1000;

/**
 * Can this order be returned, and how many of each item?
 * `order` needs: status, deliveredAt, items[{ id, quantity, returnedQty, ... }]; `openQty` maps orderItemId → qty in open requests.
 */
export function returnEligibility(order, settings, openQty = {}) {
  if (!settings.returnsEnabled) return { eligible: false, why: "Returns aren't available right now." };
  if (order.status !== "DELIVERED" || !order.deliveredAt) {
    return { eligible: false, why: "You can request a return once your order has been delivered." };
  }
  const deadline = new Date(new Date(order.deliveredAt).getTime() + settings.returnWindowDays * DAY);
  if (deadline < new Date()) {
    return { eligible: false, why: `The ${settings.returnWindowDays}-day return window has ended.`, deadline };
  }
  const items = order.items
    .map((it) => ({ ...it, max: Math.max(0, it.quantity - it.returnedQty - (openQty[it.id] ?? 0)) }))
    .filter((it) => it.max > 0);
  if (!items.length) return { eligible: false, why: "Everything in this order is already being returned.", deadline };
  return { eligible: true, deadline, items };
}

/** orderItemId → quantity in open return requests for this order. */
export async function openReturnQuantities(orderId) {
  const rows = await db.returnItem.findMany({
    where: { returnRequest: { orderId, status: { in: OPEN_RETURN } } },
    select: { orderItemId: true, quantity: true },
  });
  const out = {};
  for (const r of rows) out[r.orderItemId] = (out[r.orderItemId] ?? 0) + r.quantity;
  return out;
}

export async function returnsForOrder(orderId) {
  const rows = await db.returnRequest.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rmaNumber: true,
      status: true,
      reason: true,
      resolution: true,
      customerNote: true,
      createdAt: true,
      items: { select: { quantity: true, orderItem: { select: { productName: true, color: true, size: true } } } },
      refunds: { where: { status: "PROCESSED" }, select: { amount: true } },
    },
  });
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    refunded: r.refunds.reduce((n, x) => n + Number(x.amount), 0),
    refunds: undefined,
  }));
}

export async function nextRmaNumber() {
  const yy = String(new Date().getFullYear()).slice(-2);
  for (let i = 0; i < 8; i += 1) {
    const candidate = `RMA-${yy}-${randomInt(100000, 1000000)}`;
    if (!(await db.returnRequest.findUnique({ where: { rmaNumber: candidate }, select: { id: true } })))
      return candidate;
  }
  return `RMA-${yy}-${Date.now().toString(36).toUpperCase()}`;
}

/** Most that can still be refunded on an order. */
export function refundable(order) {
  return round2(Math.max(0, Number(order.grandTotal) - Number(order.refundedTotal)));
}

/**
 * Record a refund the shop has made (bank transfer, wallet, cash, or in the
 * Safepay dashboard). Updates the order's refunded total and payment status.
 * Throws Error("TOO_MUCH") if it exceeds what's left. Returns the refund id.
 */
export async function recordRefund({ orderId, amount, method, reference, reason, returnRequestId = null, actorId }) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { grandTotal: true, refundedTotal: true, paymentStatus: true },
    });
    if (!order) throw new Error("NOT_FOUND");
    const left = refundable(order);
    const amt = round2(amount);
    if (!(amt > 0) || amt > left + 0.001) throw new Error("TOO_MUCH");
    const payment = await tx.payment.findFirst({
      where: { orderId, status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const refund = await tx.refund.create({
      data: {
        orderId,
        paymentId: payment?.id ?? null,
        returnRequestId,
        amount: amt.toFixed(2),
        method,
        status: "PROCESSED",
        reason: reason || null,
        providerRefundId: reference || null,
        processedById: actorId,
        processedAt: new Date(),
      },
      select: { id: true },
    });
    const total = round2(Number(order.refundedTotal) + amt);
    await tx.order.update({
      where: { id: orderId },
      data: {
        refundedTotal: total.toFixed(2),
        // Only money actually collected can be "refunded".
        ...(["PAID", "PARTIALLY_REFUNDED"].includes(order.paymentStatus)
          ? { paymentStatus: total >= Number(order.grandTotal) - 0.001 ? "REFUNDED" : "PARTIALLY_REFUNDED" }
          : {}),
      },
    });
    return refund.id;
  });
}
