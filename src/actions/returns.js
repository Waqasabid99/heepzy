"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getStoreSettings } from "@/lib/settings";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { getOrderForViewer } from "@/lib/orders";
import { EVIDENCE_REASONS, nextRmaNumber, openReturnQuantities, returnEligibility } from "@/lib/returns";
import { existingMedia, MAX_PHOTOS, MAX_VIDEOS, mediaKind } from "@/lib/return-media";

const schema = z.object({
  orderNumber: z.string().max(20),
  token: z.string().max(80).default(""),
  items: z
    .array(z.object({ orderItemId: z.string().min(10).max(40), quantity: z.coerce.number().int().min(0).max(50) }))
    .max(40),
  reason: z.enum(["WRONG_SIZE", "DEFECTIVE", "NOT_AS_DESCRIBED", "WRONG_ITEM", "CHANGED_MIND", "OTHER"], {
    error: "Tell us why you're returning it",
  }),
  resolution: z.enum(["EXCHANGE", "REFUND"], { error: "Choose exchange or refund" }),
  note: z.string().trim().max(1000).default(""),
  media: z
    .array(z.string().max(40))
    .max(MAX_PHOTOS + MAX_VIDEOS)
    .default([]),
});

const orderPath = (orderNumber, token) =>
  `/checkout/complete/${orderNumber}${token ? `?t=${encodeURIComponent(token)}` : ""}`;

/** Customer: request a return or exchange for a delivered order. */
export async function requestReturn(_prev, formData) {
  const rl = await rateLimit("returnRequest", LIMITS.returnRequest);
  if (!rl.ok) return { ok: false, message: "Too many requests. Please try again in a while or contact us." };

  const json = (k) => {
    try {
      return JSON.parse(String(formData.get(k) ?? "[]"));
    } catch {
      return [];
    }
  };
  const items = json("items");
  const parsed = schema.safeParse({
    orderNumber: String(formData.get("orderNumber") ?? ""),
    token: String(formData.get("token") ?? ""),
    items,
    reason: formData.get("reason") ?? undefined,
    resolution: formData.get("resolution") ?? undefined,
    note: String(formData.get("note") ?? ""),
    media: json("media"),
  });
  if (!parsed.success) {
    const errors = {};
    for (const i of parsed.error.issues) errors[i.path[0] ?? "form"] ??= i.message;
    return { ok: false, errors };
  }
  const f = parsed.data;

  const order = await getOrderForViewer(f.orderNumber, f.token);
  if (!order) return { ok: false, message: "We couldn't find this order." };
  const settings = await getStoreSettings();
  if (f.resolution === "REFUND" && !settings.refundsEnabled) {
    return { ok: false, errors: { resolution: "Refunds aren't offered. Choose an exchange." } };
  }
  const check = returnEligibility(order, settings, await openReturnQuantities(order.id));
  if (!check.eligible) return { ok: false, message: check.why };

  const max = new Map(check.items.map((i) => [i.id, i.max]));
  const chosen = f.items.filter((i) => i.quantity > 0);
  if (!chosen.length) return { ok: false, errors: { items: "Choose at least one item to return" } };
  for (const i of chosen) {
    if (!max.has(i.orderItemId) || i.quantity > max.get(i.orderItemId)) {
      return { ok: false, errors: { items: "One of the quantities is more than you can return" } };
    }
  }
  if ((f.reason === "OTHER" || f.resolution === "EXCHANGE") && f.note.length < 3) {
    return {
      ok: false,
      errors: {
        note: f.resolution === "EXCHANGE" ? "Tell us the size or colour you'd like instead" : "Tell us a little more",
      },
    };
  }

  // Photos/videos must have been uploaded for this order (see /api/returns/media).
  const media = await existingMedia(order.id, [...new Set(f.media)]);
  const photos = media.filter((n) => mediaKind(n) === "image").length;
  const videos = media.length - photos;
  if (photos > MAX_PHOTOS || videos > MAX_VIDEOS) {
    return { ok: false, errors: { media: `Up to ${MAX_PHOTOS} photos and ${MAX_VIDEOS} videos` } };
  }
  if (EVIDENCE_REASONS.includes(f.reason) && !media.length) {
    return {
      ok: false,
      errors: { media: "Please add photos or your unboxing video so we can see the problem" },
    };
  }

  const rmaNumber = await nextRmaNumber();
  const request = await db.returnRequest.create({
    data: {
      rmaNumber,
      orderId: order.id,
      userId: order.userId ?? null,
      reason: f.reason,
      resolution: f.resolution,
      customerNote: f.note || null,
      imageUrls: media.length ? media.map((name) => ({ name, kind: mediaKind(name) })) : undefined,
      items: { create: chosen.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity })) },
    },
    select: { id: true },
  });
  await audit({
    actorId: order.userId ?? null,
    action: "return.request",
    entity: "ReturnRequest",
    entityId: request.id,
    metadata: { rmaNumber, orderNumber: order.orderNumber, items: chosen.length },
  });
  redirect(`${orderPath(order.orderNumber, f.token)}${f.token ? "&" : "?"}return=${rmaNumber}#returns`);
}

/** Customer: withdraw a request that hasn't been reviewed yet. */
export async function cancelReturnRequest(orderNumber, token, returnId) {
  const order = await getOrderForViewer(String(orderNumber), String(token ?? ""));
  if (!order) return { ok: false, message: "We couldn't find this order." };
  const res = await db.returnRequest.updateMany({
    where: { id: String(returnId), orderId: order.id, status: "REQUESTED" },
    data: { status: "CANCELLED" },
  });
  if (!res.count) return { ok: false, message: "This request can no longer be cancelled." };
  await audit({
    actorId: order.userId ?? null,
    action: "return.cancel",
    entity: "ReturnRequest",
    entityId: String(returnId),
  });
  refresh();
  return { ok: true, message: "Return request cancelled." };
}
