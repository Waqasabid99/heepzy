import { connection } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/payments/paysafe";

const MAX_BODY_BYTES = 256 * 1024;

/**
 * Paysafe webhook receiver.
 * - Verifies the HMAC signature against the raw body (rejects forgeries).
 * - Stores each event once (unique provider+eventId) for idempotency.
 * - Payment/refund state transitions are handled in src/server/payments (to be built).
 */
export async function POST(request) {
  await connection();

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return new Response("Payload too large", { status: 413 });

  if (!verifyWebhookSignature(raw, request.headers.get("signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const eventId = String(event?.id ?? event?.payload?.id ?? "").slice(0, 128);
  const eventType = String(event?.eventName ?? event?.type ?? "unknown").slice(0, 80);
  if (!eventId) return new Response("Bad request", { status: 400 });

  try {
    await db.webhookEvent.create({ data: { provider: "PAYSAFE", eventId, eventType, payload: event } });
  } catch (err) {
    // P2002 = unique violation → already received; acknowledge so Paysafe stops retrying.
    if (err?.code === "P2002") return new Response("OK", { status: 200 });
    console.error("[paysafe-webhook] failed to store event", err);
    return new Response("Error", { status: 500 });
  }

  // TODO(payments): process event → update Payment / Order / Refund in a transaction.
  return new Response("OK", { status: 200 });
}
