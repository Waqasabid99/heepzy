import "server-only";
import { cache } from "react";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { open } from "@/lib/secret-box";
import { SETTINGS_TAG } from "@/lib/settings";

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
 *
 * Keys come from the server environment if set there, otherwise from the
 * owner's entry in Admin → Settings → Payments (encrypted, `payment_gateways`).
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

const envKeys = () =>
  env.NEXT_PUBLIC_SAFEPAY_PUBLIC_KEY && env.SAFEPAY_SECRET_KEY
    ? {
        source: "env",
        environment: env.SAFEPAY_ENVIRONMENT,
        publicKey: env.NEXT_PUBLIC_SAFEPAY_PUBLIC_KEY,
        secretKey: env.SAFEPAY_SECRET_KEY,
        webhookSecret: env.SAFEPAY_WEBHOOK_SHARED_SECRET_KEY || null,
      }
    : null;

/** Context strings bind each sealed value to its field. */
export const SEAL = { secret: "safepay:secret", webhook: "safepay:webhook" };

/**
 * The keys to call Safepay with (decrypted), or null if none are set.
 * Server-only and never cached across requests; don't pass the result to the browser.
 */
export const getSafepayKeys = cache(async () => {
  const fromEnv = envKeys();
  if (fromEnv) return fromEnv;
  const row = await db.paymentGateway.findUnique({ where: { provider: "SAFEPAY" } });
  if (!row) return null;
  const secretKey = open(row.secretKeyEnc, SEAL.secret);
  if (!secretKey) {
    console.error("[safepay] saved keys can't be decrypted (was SECRETS_ENCRYPTION_KEY changed?)");
    return null;
  }
  return {
    source: "admin",
    environment: row.environment === "production" ? "production" : "sandbox",
    publicKey: row.publicKey,
    secretKey,
    webhookSecret: row.webhookSecretEnc ? open(row.webhookSecretEnc, SEAL.webhook) : null,
  };
});

/**
 * Safe-to-show status (no secrets): where the keys come from, mode, and
 * last-4 hints. Cached with the store settings.
 */
export async function getSafepayStatus() {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");
  const fromEnv = envKeys();
  if (fromEnv) {
    return {
      configured: true,
      source: "env",
      environment: fromEnv.environment,
      publicKeyHint: fromEnv.publicKey.slice(-4),
      secretHint: fromEnv.secretKey.slice(-4),
      webhookHint: fromEnv.webhookSecret ? fromEnv.webhookSecret.slice(-4) : null,
      updatedAt: null,
    };
  }
  const row = await db.paymentGateway.findUnique({ where: { provider: "SAFEPAY" } });
  if (!row) return { configured: false, source: null, environment: "sandbox" };
  const readable = Boolean(open(row.secretKeyEnc, SEAL.secret));
  return {
    configured: readable,
    unreadable: !readable,
    source: "admin",
    environment: row.environment === "production" ? "production" : "sandbox",
    publicKeyHint: row.publicKey.slice(-4),
    secretHint: row.secretHint,
    webhookHint: row.webhookHint,
    updatedAt: row.updatedAt.toISOString(),
    updatedById: row.updatedById,
  };
}

export async function safepayConfigured() {
  return (await getSafepayStatus()).configured;
}

/** PKR → paisa (Safepay amounts are in the lowest denomination). */
export function toPaisa(amount) {
  return Math.round(Number(amount) * 100);
}

async function call(keys, path, { method = "GET", body } = {}) {
  const res = await fetch(`${API[keys.environment]}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-SFPY-MERCHANT-SECRET": keys.secretKey,
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
  const keys = await getSafepayKeys();
  if (!keys) throw new Error("Safepay is not configured");
  const session = await call(keys, "/order/payments/v3/", {
    method: "POST",
    body: {
      merchant_api_key: keys.publicKey,
      intent: "CYBERSOURCE",
      mode: "payment",
      currency: "PKR",
      amount: toPaisa(amount),
      metadata: { order_id: orderNumber },
    },
  });
  const tracker = session?.data?.tracker?.token;
  if (!tracker) throw new Error("Safepay did not return a tracker");

  const passport = await call(keys, "/client/passport/v1/token", { method: "POST" });
  const tbt = passport?.data;
  if (typeof tbt !== "string" || !tbt) throw new Error("Safepay did not return a checkout token");

  const params = new URLSearchParams({
    environment: keys.environment,
    tracker,
    tbt,
    source: "hosted",
    redirect_url: redirectUrl,
    cancel_url: cancelUrl,
  });
  return { tracker, url: `${CHECKOUT[keys.environment]}?${params}` };
}

/**
 * Check a set of keys against Safepay before saving them: opens a Rs 1 payment
 * session (never charged; it just expires) and asks for a checkout token, which
 * needs both the public and the secret key to be right for this mode.
 * Returns { ok: true } or { ok: false, message }.
 */
export async function testSafepayKeys(keys) {
  try {
    const session = await call(keys, "/order/payments/v3/", {
      method: "POST",
      body: { merchant_api_key: keys.publicKey, intent: "CYBERSOURCE", mode: "payment", currency: "PKR", amount: 100 },
    });
    if (!session?.data?.tracker?.token) throw new Error("no tracker");
    const passport = await call(keys, "/client/passport/v1/token", { method: "POST" });
    if (typeof passport?.data !== "string") throw new Error("no token");
    return { ok: true };
  } catch (err) {
    console.error("[safepay] key test failed", err?.message);
    const timeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    return {
      ok: false,
      message: timeout
        ? "Safepay didn't answer. Check the connection and try again."
        : `Safepay didn't accept these keys in ${keys.environment === "production" ? "live" : "sandbox"} mode. Check that both keys are from the same Safepay account and mode.`,
    };
  }
}

/** Authoritative payment state from Safepay's reporter API. */
export async function fetchTracker(tracker) {
  if (!/^track_[a-f0-9-]{36}$/.test(String(tracker))) return null;
  const keys = await getSafepayKeys();
  if (!keys) throw new Error("Safepay is not configured");
  const json = await call(keys, `/reporter/api/v1/payments/${tracker}`);
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
export async function verifyWebhookSignature(rawBody, signature) {
  const secret = (await getSafepayKeys())?.webhookSecret;
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
