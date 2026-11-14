import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { DEFAULT_TEMPLATES, MESSAGE_EVENTS } from "@/lib/message-templates";

export const MESSAGE_PAGE_SIZE = 30;
export const MESSAGE_TABS = ["PENDING", "SENT", "SKIPPED"];

const one = (v) => (Array.isArray(v) ? v[0] : v);

export function parseMessageParams(sp = {}) {
  return {
    status: MESSAGE_TABS.includes(one(sp.status)) ? one(sp.status) : "PENDING",
    page: Math.max(1, Math.min(Number.parseInt(one(sp.page), 10) || 1, 1000)),
  };
}

const select = {
  id: true,
  event: true,
  refId: true,
  phone: true,
  body: true,
  status: true,
  createdAt: true,
  handledAt: true,
  order: { select: { id: true, orderNumber: true, shipFullName: true, shipCity: true, status: true } },
};

const plain = (m) => ({ ...m, createdAt: m.createdAt.toISOString(), handledAt: m.handledAt?.toISOString() ?? null });

export async function listMessages({ status, page }) {
  await requireStaff();
  const [total, rows, grouped] = await Promise.all([
    db.outboundMessage.count({ where: { status } }),
    db.outboundMessage.findMany({
      where: { status },
      // Oldest first while waiting (send in order); newest first once handled.
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      skip: (page - 1) * MESSAGE_PAGE_SIZE,
      take: MESSAGE_PAGE_SIZE,
      select,
    }),
    db.outboundMessage.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / MESSAGE_PAGE_SIZE)),
    counts: Object.fromEntries(grouped.map((g) => [g.status, g._count._all])),
    messages: rows.map(plain),
  };
}

export async function orderMessages(orderId) {
  await requireStaff();
  const rows = await db.outboundMessage.findMany({ where: { orderId }, orderBy: { createdAt: "asc" }, select });
  return rows.map(plain);
}

/** For the admin nav badge (called by both the sidebar and the phone menu in one request). */
export const pendingMessageCount = cache(async () => db.outboundMessage.count({ where: { status: "PENDING" } }));

export async function getMessageTemplates() {
  await requireStaff();
  const rows = await db.messageTemplate.findMany();
  const byEvent = new Map(rows.map((r) => [r.event, r]));
  return Object.keys(MESSAGE_EVENTS).map((event) => ({
    event,
    enabled: byEvent.get(event)?.enabled ?? true,
    body: byEvent.get(event)?.body ?? DEFAULT_TEMPLATES[event],
    custom: byEvent.has(event),
  }));
}
