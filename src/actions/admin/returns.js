"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { CATALOG_TAG } from "@/lib/catalog";
import { formatPKR } from "@/lib/money";
import { recordRefund } from "@/lib/returns";
import { queueRefundMessage, queueReturnMessage, toSend } from "@/lib/messages";

const id = z.string().min(10).max(40);
const note = z.string().trim().max(1000).default("");
const METHODS = ["ORIGINAL_PAYMENT", "BANK_TRANSFER", "WALLET_TRANSFER", "CASH", "STORE_CREDIT"];

const log = (adminId, action, returnId, metadata) =>
  audit({ actorId: adminId, action, entity: "ReturnRequest", entityId: returnId, metadata });

/** Move a request from one status to another only if it's still in `from`. */
async function transition(returnId, from, to, adminId, extra = {}) {
  const res = await db.returnRequest.updateMany({
    where: { id: returnId, status: { in: from } },
    data: { status: to, reviewedById: adminId, reviewedAt: new Date(), ...extra },
  });
  return res.count > 0;
}

export async function approveReturn(returnId, message) {
  const admin = await requireStaff();
  const p = z.object({ returnId: id, message: note }).safeParse({ returnId, message });
  if (!p.success) return { ok: false, message: "Invalid request." };
  if (!(await transition(p.data.returnId, ["REQUESTED"], "APPROVED", admin.id))) {
    return { ok: false, message: "This request has already been reviewed." };
  }
  await log(admin.id, "return.approve", p.data.returnId, { note: p.data.message || null });
  const msg = await queueReturnMessage(p.data.returnId, "RETURN_APPROVED", { note: p.data.message });
  refresh();
  return {
    ok: true,
    message: "Approved. Arrange the pickup with the customer.",
    whatsapp: toSend(msg),
    at: Date.now(),
  };
}

export async function rejectReturn(returnId, message) {
  const admin = await requireStaff();
  const p = z
    .object({ returnId: id, message: z.string().trim().min(3, "Give the reason (the customer sees it)").max(1000) })
    .safeParse({ returnId, message });
  if (!p.success) return { ok: false, message: p.error.issues[0].message };
  if (
    !(await transition(p.data.returnId, ["REQUESTED", "APPROVED"], "REJECTED", admin.id, { adminNote: p.data.message }))
  ) {
    return { ok: false, message: "This request can no longer be rejected." };
  }
  await log(admin.id, "return.reject", p.data.returnId, { note: p.data.message });
  const msg = await queueReturnMessage(p.data.returnId, "RETURN_REJECTED", { note: p.data.message });
  refresh();
  return { ok: true, message: "Request rejected.", whatsapp: toSend(msg), at: Date.now() };
}

const receiveSchema = z.object({
  returnId: id,
  items: z
    .array(
      z.object({
        returnItemId: id,
        condition: z.enum(["UNWORN", "WORN", "DAMAGED"]),
        restock: z.boolean(),
      }),
    )
    .min(1)
    .max(40),
});

/** The shoes are back: record their condition and put unworn pairs back on sale. */
export async function receiveReturn(input) {
  const admin = await requireStaff();
  const p = receiveSchema.safeParse(input);
  if (!p.success) return { ok: false, message: "Choose the condition of every item." };
  const { returnId, items } = p.data;
  const ret = await db.returnRequest.findUnique({
    where: { id: returnId },
    select: {
      status: true,
      rmaNumber: true,
      order: { select: { orderNumber: true } },
      items: { select: { id: true, quantity: true, orderItemId: true, orderItem: { select: { variantId: true } } } },
    },
  });
  if (!ret || !["APPROVED", "IN_TRANSIT"].includes(ret.status)) {
    return { ok: false, message: "Only approved returns can be marked as received." };
  }
  const byId = new Map(items.map((i) => [i.returnItemId, i]));
  if (ret.items.some((i) => !byId.has(i.id))) return { ok: false, message: "Choose the condition of every item." };

  let restocked = 0;
  try {
    await db.$transaction(async (tx) => {
      const moved = await tx.returnRequest.updateMany({
        where: { id: returnId, status: { in: ["APPROVED", "IN_TRANSIT"] } },
        data: { status: "RECEIVED", reviewedById: admin.id, reviewedAt: new Date() },
      });
      if (!moved.count) throw new Error("CHANGED");
      for (const ri of ret.items) {
        const choice = byId.get(ri.id);
        const restock = choice.restock && Boolean(ri.orderItem.variantId);
        await tx.returnItem.update({ where: { id: ri.id }, data: { condition: choice.condition, restock } });
        await tx.orderItem.update({ where: { id: ri.orderItemId }, data: { returnedQty: { increment: ri.quantity } } });
        if (restock) {
          const v = await tx.productVariant.update({
            where: { id: ri.orderItem.variantId },
            data: { stock: { increment: ri.quantity } },
            select: { stock: true },
          });
          await tx.inventoryMovement.create({
            data: {
              variantId: ri.orderItem.variantId,
              change: ri.quantity,
              stockAfter: v.stock,
              reason: "RETURN",
              actorId: admin.id,
              note: `Return ${ret.rmaNumber} (order ${ret.order.orderNumber})`,
            },
          });
          restocked += ri.quantity;
        }
      }
    });
  } catch (e) {
    if (e?.message === "CHANGED")
      return { ok: false, message: "This return was updated by someone else. Reload the page." };
    throw e;
  }
  await log(admin.id, "return.receive", returnId, { restocked, conditions: items.map((i) => i.condition) });
  if (restocked) updateTag(CATALOG_TAG);
  const msg = await queueReturnMessage(returnId, "RETURN_RECEIVED");
  refresh();
  return {
    ok: true,
    message: restocked ? `Received. ${restocked} ${restocked === 1 ? "pair" : "pairs"} back in stock.` : "Received.",
    whatsapp: toSend(msg),
    at: Date.now(),
  };
}

/** If every item of the order has come back, mark the order as returned. */
async function markOrderReturnedIfDone(orderId, adminId) {
  const items = await db.orderItem.findMany({ where: { orderId }, select: { quantity: true, returnedQty: true } });
  if (!items.length || items.some((i) => i.returnedQty < i.quantity)) return;
  const res = await db.order.updateMany({ where: { id: orderId, status: "DELIVERED" }, data: { status: "RETURNED" } });
  if (res.count) {
    await db.orderStatusHistory.create({
      data: { orderId, status: "RETURNED", note: "All items returned", actorId: adminId },
    });
  }
}

const refundSchema = z.object({
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter the amount, e.g. 3490"),
  method: z.enum(METHODS, { error: "Choose how the money was sent" }),
  reference: z.string().trim().max(120).default(""),
});

/** Refund a received return (money already sent by the shop) and complete it. */
export async function refundReturn(returnId, input) {
  const admin = await requireStaff();
  if (!id.safeParse(returnId).success) return { ok: false, message: "Invalid request." };
  const p = refundSchema.safeParse(input ?? {});
  if (!p.success) {
    const errors = {};
    for (const i of p.error.issues) errors[i.path[0]] ??= i.message;
    return { ok: false, errors };
  }
  const ret = await db.returnRequest.findUnique({
    where: { id: returnId },
    select: { status: true, rmaNumber: true, orderId: true },
  });
  if (!ret || ret.status !== "RECEIVED") return { ok: false, message: "Mark the return as received first." };
  let refundId;
  try {
    refundId = await recordRefund({
      orderId: ret.orderId,
      amount: Number(p.data.amount),
      method: p.data.method,
      reference: p.data.reference,
      reason: `Return ${ret.rmaNumber}`,
      returnRequestId: returnId,
      actorId: admin.id,
    });
  } catch (e) {
    if (e?.message === "TOO_MUCH")
      return { ok: false, errors: { amount: "More than is left to refund on this order" } };
    throw e;
  }
  await transition(returnId, ["RECEIVED"], "COMPLETED", admin.id);
  await markOrderReturnedIfDone(ret.orderId, admin.id);
  await log(admin.id, "return.refund", returnId, {
    amount: p.data.amount,
    method: p.data.method,
    reference: p.data.reference || null,
  });
  const msg = await queueRefundMessage(refundId);
  refresh();
  return {
    ok: true,
    message: `Refund of ${formatPKR(p.data.amount)} recorded. Return completed.`,
    whatsapp: toSend(msg),
    at: Date.now(),
  };
}

/** Finish an exchange (or a return with no refund). */
export async function completeReturn(returnId, message) {
  const admin = await requireStaff();
  const p = z.object({ returnId: id, message: note }).safeParse({ returnId, message });
  if (!p.success) return { ok: false, message: "Invalid request." };
  const ret = await db.returnRequest.findUnique({ where: { id: p.data.returnId }, select: { orderId: true } });
  if (!ret || !(await transition(p.data.returnId, ["RECEIVED"], "COMPLETED", admin.id))) {
    return { ok: false, message: "Mark the return as received first." };
  }
  await markOrderReturnedIfDone(ret.orderId, admin.id);
  await log(admin.id, "return.complete", p.data.returnId, { note: p.data.message || null });
  const msg = await queueReturnMessage(p.data.returnId, "RETURN_COMPLETED", { note: p.data.message });
  refresh();
  return { ok: true, message: "Return completed.", whatsapp: toSend(msg), at: Date.now() };
}

export async function cancelReturnByAdmin(returnId, message) {
  const admin = await requireStaff();
  const p = z.object({ returnId: id, message: note }).safeParse({ returnId, message });
  if (!p.success) return { ok: false, message: "Invalid request." };
  if (!(await transition(p.data.returnId, ["REQUESTED", "APPROVED", "IN_TRANSIT"], "CANCELLED", admin.id))) {
    return { ok: false, message: "This return can no longer be cancelled." };
  }
  await log(admin.id, "return.cancel", p.data.returnId, { note: p.data.message || null });
  refresh();
  return { ok: true, message: "Return cancelled." };
}

/** Save the private note on a return. */
export async function saveReturnNote(returnId, adminNote) {
  const admin = await requireStaff();
  const p = z
    .object({ returnId: id, adminNote: z.string().trim().max(2000) })
    .safeParse({ returnId, adminNote: adminNote ?? "" });
  if (!p.success) return { ok: false, message: "Note is too long." };
  await db.returnRequest.update({ where: { id: p.data.returnId }, data: { adminNote: p.data.adminNote || null } });
  await log(admin.id, "return.note", p.data.returnId);
  refresh();
  return { ok: true, message: "Note saved." };
}

/** Record a refund on an order outside the returns flow (e.g. a cancelled card order refunded in Safepay). */
export async function recordOrderRefund(orderId, input) {
  const admin = await requireStaff();
  if (!id.safeParse(orderId).success) return { ok: false, message: "Invalid request." };
  const p = refundSchema
    .extend({ reason: z.string().trim().min(3, "Say why, e.g. Order cancelled").max(255) })
    .safeParse(input ?? {});
  if (!p.success) {
    const errors = {};
    for (const i of p.error.issues) errors[i.path[0]] ??= i.message;
    return { ok: false, errors };
  }
  let refundId;
  try {
    refundId = await recordRefund({
      orderId,
      amount: Number(p.data.amount),
      method: p.data.method,
      reference: p.data.reference,
      reason: p.data.reason,
      actorId: admin.id,
    });
  } catch (e) {
    if (e?.message === "TOO_MUCH")
      return { ok: false, errors: { amount: "More than is left to refund on this order" } };
    if (e?.message === "NOT_FOUND") return { ok: false, message: "Order not found." };
    throw e;
  }
  await audit({ actorId: admin.id, action: "order.refund", entity: "Order", entityId: orderId, metadata: p.data });
  const msg = await queueRefundMessage(refundId);
  refresh();
  return {
    ok: true,
    message: `Refund of ${formatPKR(p.data.amount)} recorded.`,
    whatsapp: toSend(msg),
    at: Date.now(),
  };
}
