import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getStoreSettings } from "@/lib/settings";
import { formatPKR } from "@/lib/money";
import { orderUrl } from "@/lib/order-link";
import { DEFAULT_TEMPLATES, MESSAGE_EVENTS, renderTemplate } from "@/lib/message-templates";

/**
 * Customer WhatsApp messages. When an order or a return moves on, a
 * ready-written message goes into the outbox (Admin → Messages); staff send it
 * from their WhatsApp with one tap. Nothing is sent by the server.
 */
export const STATUS_EVENT = {
  CONFIRMED: "ORDER_CONFIRMED",
  SHIPPED: "ORDER_SHIPPED",
  DELIVERED: "ORDER_DELIVERED",
  CANCELLED: "ORDER_CANCELLED",
};

const PAYMENT_WORDS = { COD: "cash on delivery", CARD: "paid by card", WALLET: "paid", MANUAL: "paid", WHATSAPP: "as agreed on WhatsApp" };
const RESOLUTION_WORDS = { EXCHANGE: "exchange", REFUND: "refund", STORE_CREDIT: "store credit" };
const REFUND_WORDS = {
  ORIGINAL_PAYMENT: "back to your card",
  BANK_TRANSFER: "bank transfer",
  WALLET_TRANSFER: "JazzCash / Easypaisa",
  CASH: "cash",
  STORE_CREDIT: "store credit",
};

export async function getTemplate(event) {
  const row = await db.messageTemplate.findUnique({ where: { event } });
  return { enabled: row?.enabled ?? true, body: row?.body ?? DEFAULT_TEMPLATES[event], custom: Boolean(row) };
}

/** The message for an order at this point, with `extra` values (return, refund…) filled in too. */
export async function buildMessage(orderId, event, extra = {}) {
  const [order, settings, tpl] = await Promise.all([
    db.order.findUnique({
      where: { id: orderId },
      include: { items: { select: { productName: true, color: true, size: true, quantity: true } } },
    }),
    getStoreSettings(),
    getTemplate(event),
  ]);
  if (!order) return null;
  const owed = order.paymentStatus === "PAID" ? 0 : Number(order.grandTotal);
  const body = renderTemplate(tpl.body, {
    name: order.shipFullName.trim().split(/\s+/)[0],
    store: settings.storeName,
    store_link: env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""),
    order: order.orderNumber,
    items: order.items.map((i) => `• ${i.productName}, ${i.color}, size ${i.size} × ${i.quantity}`).join("\n"),
    total: formatPKR(order.grandTotal),
    payment: order.paymentStatus === "PAID" ? "paid" : PAYMENT_WORDS[order.paymentMethod],
    cod: owed > 0 ? formatPKR(owed) : "",
    courier: order.courier ?? "",
    tracking: order.trackingNumber ?? "",
    link: orderUrl(order.orderNumber),
    return_days: settings.returnsEnabled ? String(settings.returnWindowDays) : "",
    ...extra,
  });
  return { order, body, enabled: tpl.enabled };
}

/**
 * Put a message in the outbox (once per order + event + refId) and return it,
 * so the admin can send it straight away. Never throws: a failed message must
 * not undo the change that caused it.
 */
export async function queueMessage({ orderId, event, refId = "", extra }) {
  if (!MESSAGE_EVENTS[event]) return null;
  try {
    const built = await buildMessage(orderId, event, extra);
    if (!built?.enabled || !built.order.phone) return null;
    return await db.outboundMessage.upsert({
      where: { orderId_event_refId: { orderId, event, refId } },
      create: { orderId, event, refId, phone: built.order.phone, body: built.body },
      update: {}, // already queued (e.g. the same step twice): keep the first one
      select: { id: true, event: true, phone: true, body: true, status: true },
    });
  } catch (err) {
    console.error("[messages] couldn't queue", event, orderId, err);
    return null;
  }
}

/** Message for an order status change (confirmed, shipped, delivered, cancelled). */
export async function queueOrderMessage(orderId, status, extra = {}) {
  const event = STATUS_EVENT[status];
  if (!event) return null;
  if (event === "ORDER_CANCELLED") {
    const o = await db.order.findUnique({
      where: { id: orderId },
      select: { paymentStatus: true, grandTotal: true, refundedTotal: true },
    });
    const paid = ["PAID", "PARTIALLY_REFUNDED"].includes(o?.paymentStatus);
    const left = o ? Number(o.grandTotal) - Number(o.refundedTotal) : 0;
    extra = { refund_amount: paid && left > 0 ? formatPKR(left) : "", ...extra };
  }
  return queueMessage({ orderId, event, extra });
}

/** Message about a return request (approved, rejected, received, completed). */
export async function queueReturnMessage(returnId, event, extra = {}) {
  const ret = await db.returnRequest.findUnique({
    where: { id: returnId },
    select: { orderId: true, rmaNumber: true, resolution: true },
  });
  if (!ret) return null;
  return queueMessage({
    orderId: ret.orderId,
    event,
    refId: returnId,
    extra: { rma: ret.rmaNumber, resolution: RESOLUTION_WORDS[ret.resolution] ?? "return", note: "", ...extra },
  });
}

/** "We've sent your refund" for one recorded refund. */
export async function queueRefundMessage(refundId) {
  const r = await db.refund.findUnique({
    where: { id: refundId },
    select: { orderId: true, amount: true, method: true, providerRefundId: true },
  });
  if (!r) return null;
  return queueMessage({
    orderId: r.orderId,
    event: "REFUND_SENT",
    refId: refundId,
    extra: {
      refund_amount: formatPKR(r.amount),
      refund_method: REFUND_WORDS[r.method] ?? "",
      reference: r.providerRefundId ?? "",
    },
  });
}

/** Only hand a message to the admin UI if it still needs sending. */
export const toSend = (m) => (m?.status === "PENDING" ? m : null);
