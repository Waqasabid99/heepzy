import { NextResponse } from "next/server";
import { getOrderForViewer, settleSafepayPayment } from "@/lib/orders";

/**
 * Safepay sends the shopper back here after paying (?tracker=…). We confirm the
 * payment with Safepay's API (never trusting the redirect itself), then show
 * the order confirmation.
 */
async function handle(request) {
  const url = new URL(request.url);
  let tracker = url.searchParams.get("tracker");
  if (!tracker && request.method === "POST") {
    const form = await request.formData().catch(() => null);
    tracker = form?.get("tracker") ? String(form.get("tracker")) : null;
  }
  const orderNumber = url.searchParams.get("order") ?? "";
  const token = url.searchParams.get("t") ?? "";

  const order = await getOrderForViewer(orderNumber, token);
  if (!order) return NextResponse.redirect(new URL("/", url), 303);

  // Use the tracker Safepay sent back, or the order's latest attempt. It must belong to this order.
  tracker ||= order.payments[0]?.providerPaymentId ?? null;
  const known = order.payments.some((p) => p.providerPaymentId === tracker);
  let result = "pending";
  if (tracker && known) {
    try {
      const r = await settleSafepayPayment(tracker, "redirect");
      result = r.status === "paid" ? "paid" : r.status === "mismatch" ? "review" : "pending";
    } catch (e) {
      console.error("[safepay] return verification failed", e);
    }
  }
  const dest = new URL(`/checkout/complete/${orderNumber}`, url);
  dest.searchParams.set("t", token);
  dest.searchParams.set("payment", result);
  return NextResponse.redirect(dest, 303);
}

export const GET = handle;
export const POST = handle;
