"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { DEFAULT_TEMPLATES, MESSAGE_EVENTS, PLACEHOLDERS } from "@/lib/message-templates";

/** Admin → Messages: mark WhatsApp messages sent/skipped, and edit their wording. */

const id = z.string().min(10).max(40);

async function setStatus(messageId, status, from) {
  const admin = await requireStaff();
  if (!id.safeParse(messageId).success) return { ok: false, message: "Message not found." };
  const res = await db.outboundMessage.updateMany({
    where: { id: messageId, status: { in: from } },
    data: {
      status,
      handledById: status === "PENDING" ? null : admin.id,
      handledAt: status === "PENDING" ? null : new Date(),
    },
  });
  if (!res.count) return { ok: false, message: "This message was already handled." };
  refresh();
  return { ok: true };
}

/** Called when staff tap "Send on WhatsApp" (WhatsApp opens in a new tab). */
export async function markMessageSent(messageId) {
  return setStatus(messageId, "SENT", ["PENDING", "SKIPPED"]);
}

export async function skipMessage(messageId) {
  return setStatus(messageId, "SKIPPED", ["PENDING"]);
}

/** Put a sent/skipped message back in the "to send" list. */
export async function reopenMessage(messageId) {
  return setStatus(messageId, "PENDING", ["SENT", "SKIPPED"]);
}

const templateSchema = z.object({
  event: z.enum(Object.keys(MESSAGE_EVENTS)),
  enabled: z.boolean(),
  body: z
    .string()
    .trim()
    .min(10, "Write the message")
    .max(2000, "Keep it under 2,000 characters")
    .refine((b) => [...b.matchAll(/\{(\w+)\}/g)].every((m) => m[1] in PLACEHOLDERS), {
      message: "Use only the placeholders listed below (check the spelling inside { }).",
    }),
});

export async function saveMessageTemplate(_prev, fd) {
  const admin = await requireStaff();
  const parsed = templateSchema.safeParse({
    event: fd.get("event"),
    enabled: fd.get("enabled") === "on",
    body: String(fd.get("body") ?? ""),
  });
  if (!parsed.success) {
    const errors = {};
    for (const i of parsed.error.issues) errors[i.path[0] ?? "form"] ??= i.message;
    return { ok: false, errors };
  }
  const { event, enabled, body } = parsed.data;
  await db.messageTemplate.upsert({ where: { event }, create: { event, enabled, body }, update: { enabled, body } });
  await audit({
    actorId: admin.id,
    action: "settings.messages",
    entity: "StoreSettings",
    entityId: "1",
    metadata: { message: MESSAGE_EVENTS[event].label, enabled },
  });
  refresh();
  return { ok: true, message: "Saved. New messages use this wording." };
}

export async function resetMessageTemplate(event) {
  const admin = await requireStaff();
  if (!Object.hasOwn(DEFAULT_TEMPLATES, event)) return { ok: false, message: "Unknown message." };
  await db.messageTemplate.deleteMany({ where: { event } });
  await audit({
    actorId: admin.id,
    action: "settings.messages",
    entity: "StoreSettings",
    entityId: "1",
    metadata: { message: MESSAGE_EVENTS[event].label, reset: true },
  });
  refresh();
  return { ok: true, message: "Back to the standard wording." };
}
