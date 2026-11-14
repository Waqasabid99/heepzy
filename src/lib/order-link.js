import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * A stable private link to a customer's order page, for messages we send
 * (WhatsApp). Signed with the server secret, so it needs no database row and
 * stays valid in every message for that order.
 */
export function orderLinkToken(orderNumber) {
  return createHmac("sha256", env.BETTER_AUTH_SECRET)
    .update(`order-link:${orderNumber}`)
    .digest("base64url")
    .slice(0, 32);
}

export function isOrderLinkToken(orderNumber, token) {
  if (typeof token !== "string" || token.length !== 32) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(orderLinkToken(orderNumber));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function orderUrl(orderNumber) {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}/checkout/complete/${orderNumber}?t=${orderLinkToken(orderNumber)}`;
}
