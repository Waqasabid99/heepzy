import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Paysafe Payments API (Payment Hub) client — server side only.
 *
 * Flow (card / digital wallet):
 *  1. Browser loads Paysafe Checkout with NEXT_PUBLIC_PAYSAFE_PUBLIC_KEY and
 *     returns a single-use `paymentHandleToken` (card data never touches us → PCI SAQ-A).
 *  2. Server action creates the Order (PENDING) + Payment (INITIATED) with a unique merchantRef.
 *  3. Server calls `createPayment()` with the token. Final state is confirmed by webhook.
 *
 * Docs: https://developer.paysafe.com/en/api-docs/payments-api/
 * NOTE: confirm PKR settlement + wallet availability for your merchant account with Paysafe.
 */

const BASE_URL = {
  TEST: "https://api.test.paysafe.com",
  LIVE: "https://api.paysafe.com",
};

export function isPaysafeConfigured() {
  return Boolean(env.PAYSAFE_API_KEY_USERNAME && env.PAYSAFE_API_KEY_PASSWORD && env.PAYSAFE_ACCOUNT_ID);
}

/** PKR → minor units (paisa). Paysafe expects integer amounts. */
export function toMinorUnits(amount) {
  return Math.round(Number(amount) * 100);
}

async function paysafeFetch(path, { method = "GET", body } = {}) {
  if (!isPaysafeConfigured()) throw new Error("Paysafe is not configured");

  const credentials = Buffer.from(`${env.PAYSAFE_API_KEY_USERNAME}:${env.PAYSAFE_API_KEY_PASSWORD}`).toString("base64");

  const res = await fetch(`${BASE_URL[env.PAYSAFE_ENV]}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      ...(env.PAYSAFE_ENV === "TEST" ? { Simulator: "EXTERNAL" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Paysafe request failed (${res.status})`);
    err.status = res.status;
    err.code = data?.error?.code;
    throw err;
  }
  return data;
}

/** Charge a payment handle token obtained from Paysafe Checkout in the browser. */
export function createPayment({ merchantRef, amount, paymentHandleToken, description, customerIp }) {
  return paysafeFetch("/paymenthub/v1/payments", {
    method: "POST",
    body: {
      merchantRefNum: merchantRef,
      amount: toMinorUnits(amount),
      currencyCode: "PKR",
      dupCheck: true,
      settleWithAuth: true,
      paymentHandleToken,
      description: description?.slice(0, 255),
      customerIp,
    },
  });
}

export function getPayment(paymentId) {
  return paysafeFetch(`/paymenthub/v1/payments/${encodeURIComponent(paymentId)}`);
}

/** Refund a settled payment (full or partial). */
export function createRefund({ settlementId, merchantRef, amount }) {
  return paysafeFetch(`/paymenthub/v1/settlements/${encodeURIComponent(settlementId)}/refunds`, {
    method: "POST",
    body: { merchantRefNum: merchantRef, amount: toMinorUnits(amount), dupCheck: true },
  });
}

/**
 * Verify a webhook's `Signature` header: base64(HMAC-SHA256(rawBody, hmacKey)).
 * Always verify against the RAW request body, before JSON parsing.
 */
export function verifyWebhookSignature(rawBody, signature) {
  if (!env.PAYSAFE_WEBHOOK_HMAC_KEY || !signature) return false;
  const expected = Buffer.from(createHmac("sha256", env.PAYSAFE_WEBHOOK_HMAC_KEY).update(rawBody).digest("base64"));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Strip anything sensitive before persisting a provider response. */
export function sanitizeProviderResponse(data) {
  if (!data || typeof data !== "object") return data;
  const { id, status, merchantRefNum, amount, currencyCode, txnTime, gatewayResponse, error } = data;
  return {
    id,
    status,
    merchantRefNum,
    amount,
    currencyCode,
    txnTime,
    gatewayResponse: gatewayResponse && {
      authCode: gatewayResponse.authCode,
      avsResponse: gatewayResponse.avsResponse,
    },
    error,
  };
}
