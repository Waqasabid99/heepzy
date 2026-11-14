"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { CATALOG_TAG } from "@/lib/catalog";
import { NEXT_STATUSES } from "@/lib/admin/orders";
import { cancelOrderAndRestock, ORDER_STATUS_LABELS, settleSafepayPayment } from "@/lib/orders";

const id = z.string().min(10).max(40);

const statusSchema = z.object({
  orderId: id,
  status: z.enum(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  note: z.string().trim().max(500).default(""),
  courier: z.string().trim().max(60).default(""),
  trackingNumber: z.string().trim().max(80).default(""),
});

/** Move an order to its next status (with courier/tracking when shipping). useActionState-compatible. */
export async function updateOrderStatus(_prev, formData) {
  const admin = await requireStaff();
  const parsed = statusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
    note: formData.get("note") ?? "",
    courier: formData.get("courier") ?? "",
    trackingNumber: formData.get("trackingNumber") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const { orderId, status, note, courier, trackingNumber } = parsed.data;

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { status: true, paymentMethod: true, paymentStatus: true, orderNumber: true },
  });
  if (!order) return { ok: false, message: "Order not found." };
  if (!NEXT_STATUSES[order.status]?.includes(status)) {
    return {
      ok: false,
      message: `Can't move an order from ${ORDER_STATUS_LABELS[order.status]} to ${ORDER_STATUS_LABELS[status]}.`,
    };
  }
  if (status === "CONFIRMED" && order.paymentMethod === "CARD" && order.paymentStatus !== "PAID") {
    return { ok: false, message: "This card order isn't paid yet. Check the payment first, or cancel it." };
  }
  if (status === "SHIPPED" && !courier) return { ok: false, message: "Enter the courier when marking as shipped." };

  if (status === "CANCELLED") {
    const done = await cancelOrderAndRestock(orderId, {
      actorId: admin.id,
      note: note || "Cancelled by admin",
    });
    if (!done) return { ok: false, message: "This order can no longer be cancelled." };
    await audit({ actorId: admin.id, action: "order.cancel", entity: "Order", entityId: orderId, metadata: { note } });
    updateTag(CATALOG_TAG); // stock went back on sale
    refresh();
    return {
      ok: true,
      message:
        order.paymentStatus === "PAID"
          ? "Order cancelled and stock restored. It was paid, so refund the customer (in the Safepay dashboard for card payments), then use Record a refund on this page."
          : "Order cancelled and stock restored.",
    };
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: {
        status,
        ...(status === "CONFIRMED" ? { confirmedAt: now } : {}),
        ...(status === "SHIPPED" ? { shippedAt: now, courier, trackingNumber: trackingNumber || null } : {}),
        ...(status === "DELIVERED" ? { deliveredAt: now } : {}),
        // COD: the rider collected the cash on delivery.
        ...(status === "DELIVERED" && order.paymentMethod === "COD" ? { paymentStatus: "PAID" } : {}),
      },
    });
    if (res.count === 0) throw new Error("CHANGED");
    if (status === "DELIVERED" && order.paymentMethod === "COD") {
      await tx.payment.updateMany({
        where: { orderId, provider: "COD", status: { in: ["INITIATED", "PENDING"] } },
        data: { status: "COMPLETED" },
      });
    }
    const autoNote =
      status === "SHIPPED"
        ? `Shipped with ${courier}${trackingNumber ? ` (tracking ${trackingNumber})` : ""}`
        : status === "DELIVERED" && order.paymentMethod === "COD"
          ? "Delivered, cash collected"
          : null;
    await tx.orderStatusHistory.create({
      data: { orderId, status, note: [autoNote, note].filter(Boolean).join(". ") || null, actorId: admin.id },
    });
  });

  await audit({ actorId: admin.id, action: "order.status", entity: "Order", entityId: orderId, metadata: { status } });
  refresh();
  return { ok: true, message: `Order marked as ${ORDER_STATUS_LABELS[status].toLowerCase()}.` };
}

/** Save the private admin note on an order. */
export async function saveAdminNote(_prev, formData) {
  const admin = await requireStaff();
  const parsed = z
    .object({ orderId: id, adminNote: z.string().trim().max(2000) })
    .safeParse({ orderId: formData.get("orderId"), adminNote: formData.get("adminNote") ?? "" });
  if (!parsed.success) return { ok: false, message: "Note is too long." };
  await db.order.update({ where: { id: parsed.data.orderId }, data: { adminNote: parsed.data.adminNote || null } });
  await audit({ actorId: admin.id, action: "order.note", entity: "Order", entityId: parsed.data.orderId });
  refresh();
  return { ok: true, message: "Note saved." };
}

/** Ask Safepay for the latest state of this order's card payment. */
export async function recheckPayment(orderId) {
  const admin = await requireStaff();
  if (!id.safeParse(orderId).success) return { ok: false, message: "Invalid request." };
  const payment = await db.payment.findFirst({
    where: { orderId, provider: "SAFEPAY", providerPaymentId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { providerPaymentId: true },
  });
  if (!payment) return { ok: false, message: "No Safepay payment found for this order." };
  let result;
  try {
    result = await settleSafepayPayment(payment.providerPaymentId, `admin:${admin.id}`);
  } catch {
    return { ok: false, message: "Couldn't reach Safepay. Please try again." };
  }
  refresh();
  const messages = {
    paid: "Payment confirmed by Safepay.",
    unpaid: `Not paid yet (Safepay status: ${result.state ?? "unknown"}).`,
    mismatch: "Safepay reports a different amount or order. Check the Safepay dashboard.",
    unknown: "Safepay doesn't recognise this payment.",
  };
  return { ok: result.status === "paid", message: messages[result.status] };
}
