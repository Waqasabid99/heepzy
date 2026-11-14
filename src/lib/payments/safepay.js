import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Safepay (Pakistan) hosted checkout — cards & wallets.
 *
 * Flow: create a payment session ("tracker") for the order amount → get a
 * short-lived passport token → redirect the shopper to Safepay's hosted page →
 * Safepay redirects back (with ?tracker=) and sends a webhook. We never trust
 * either signal alone: both trigger `fetchTracker`, which asks Safepay's API
 * for the real state and amount before the order is marked paid.
 *
 * API: https://safepay-docs.netlify.app (Express checkout, Webhooks).
 */
const API = {
  sandbox: "https://sandbox.api.getsafepay.com",
  production: "https://api.getsafepay.com",
};
const CHECKOUT = {
  sandbox: "https://sandbox.api.getsafepay.com/embedded/",
  production: "https://getsafepay.com/embedded/",
};
export const PAID_STATE = "TRACKER_ENDED";

export function safepayConfigured() {
  return Boolean(env.NEXT_PUBLIC_SAFEPAY_PUBLIC_KEY && env.SAFEPAY_SECRET_KEY);
}

/** PKR → paisa (Safepay amounts are in the lowest denomination). */
export function toPaisa(amount) {
  return Math.round(Number(amount) * 100);
}

async function call(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API[env.SAFEPAY_ENVIRONMENT]}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-SFPY-MERCHANT-SECRET": env.SAFEPAY_SECRET_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  if (!res.ok) {
    const reason = json?.status?.errors?.join?.(", ") || json?.message || `HTTP ${res.status}`;
    throw new Error(`Safepay ${method} ${path} failed: ${reason}`);
  }
  return json;
}

/**
 * Start a hosted checkout for an order. Returns the tracker token (store it on
 * the Payment) and the URL to send the shopper to.
 */
export async function createCheckout({ amount, orderNumber, redirectUrl, cancelUrl }) {
  if (!safepayConfigured()) throw new Error("Safepay is not configured");
  const session = await call("/order/payments/v3/", {
    method: "POST",
    body: {
      merchant_api_key: env.NEXT_PUBLIC_SAFEPAY_PUBLIC_KEY,
      intent: "CYBERSOURCE",
      mode: "payment",
      currency: "PKR",
      amount: toPaisa(amount),
      metadata: { order_id: orderNumber },
    },
  });
  const tracker = session?.data?.tracker?.token;
  if (!tracker) throw new Error("Safepay did not return a tracker");

  const passport = await call("/client/passport/v1/token", { method: "POST" });
  const tbt = passport?.data;
  if (typeof tbt !== "string" || !tbt) throw new Error("Safepay did not return a checkout token");

  const params = new URLSearchParams({
    environment: env.SAFEPAY_ENVIRONMENT,
    tracker,
    tbt,
    source: "hosted",
    redirect_url: redirectUrl,
    cancel_url: cancelUrl,
  });
  return { tracker, url: `${CHECKOUT[env.SAFEPAY_ENVIRONMENT]}?${params}` };
}

/** Authoritative payment state from Safepay's reporter API. */
export async function fetchTracker(tracker) {
  if (!/^track_[a-f0-9-]{36}$/.test(String(tracker))) return null;
  const json = await call(`/reporter/api/v1/payments/${tracker}`);
  const d = json?.data;
  if (!d) return null;
  return {
    tracker: d.token,
    state: d.state,
    paid: d.state === PAID_STATE,
    amountPaisa: d.purchase_totals?.quote_amount?.amount ?? null,
    currency: d.purchase_totals?.quote_amount?.currency ?? null,
    orderNumber: d.metadata?.order_id?.value ?? null,
    environment: d.environment,
  };
}

/**
 * Verify a webhook: HMAC-SHA512 (hex) with the endpoint's shared secret,
 * sent in X-SFPY-SIGNATURE. We check the raw body first and, for Safepay's
 * older format, the serialised `data` object. Constant-time comparison.
 */
export function verifyWebhookSignature(rawBody, signature) {
  const secret = env.SAFEPAY_WEBHOOK_SHARED_SECRET_KEY;
  if (!secret || !signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = Buffer.from(signature.toLowerCase(), "hex");
  const candidates = [rawBody];
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed?.data !== undefined) candidates.push(JSON.stringify(parsed.data));
  } catch {}
  return candidates.some((payload) => {
    const digest = createHmac("sha512", secret).update(payload).digest();
    return digest.length === expected.length && timingSafeEqual(digest, expected);
  });
}
