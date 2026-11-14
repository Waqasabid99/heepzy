import { createHash } from "node:crypto";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/payments/safepay";
import { settleSafepayPayment } from "@/lib/orders";

const MAX_BODY_BYTES = 256 * 1024;

/** Pull the tracker token out of the payload, whichever Safepay shape it uses. */
function findTracker(event) {
  const candidates = [
    event?.data?.tracker,
    event?.data?.notification?.tracker,
    event?.data?.data?.tracker,
    event?.tracker,
    event?.data?.token,
  ];
  for (const c of candidates) {
    const t = typeof c === "string" ? c : c?.token;
    if (typeof t === "string" && /^track_[a-f0-9-]{36}$/.test(t)) return t;
  }
  return null;
}

/**
 * Safepay webhook receiver.
 * 1. Verifies X-SFPY-SIGNATURE (HMAC-SHA512 of the body with the shared secret).
 * 2. Stores each event once (idempotent by provider + event id).
 * 3. On payment events, re-checks the tracker with Safepay's API and settles the order.
 * Always answers 200 for authentic events so Safepay doesn't retry forever.
 */
export async function POST(request) {
  await connection();
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return new Response("Payload too large", { status: 413 });
  if (!(await verifyWebhookSignature(raw, request.headers.get("x-sfpy-signature")))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const type = String(event?.type ?? event?.data?.type ?? "unknown").slice(0, 80);
  const tracker = findTracker(event);
  const eventId = String(event?.token ?? event?.id ?? createHash("sha256").update(raw).digest("hex")).slice(0, 128);

  let record;
  try {
    record = await db.webhookEvent.create({
      data: { provider: "SAFEPAY", eventId, eventType: type, payload: event },
    });
  } catch (e) {
    if (e?.code === "P2002") return Response.json({ ok: true, duplicate: true });
    throw e;
  }

  let error = null;
  try {
    if (tracker && /^payment\./.test(type)) await settleSafepayPayment(tracker, "webhook");
  } catch (e) {
    error = String(e?.message ?? e).slice(0, 2000);
    console.error("[safepay] webhook processing failed", e);
  }
  await db.webhookEvent.update({ where: { id: record.id }, data: { processedAt: new Date(), error } });
  return Response.json({ ok: true });
}
