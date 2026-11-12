import "server-only";
import { headers } from "next/headers";

const TRUSTED_PROXIES = new Set(
  (process.env.TRUSTED_PROXIES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

/**
 * Resolve the client IP from forwarding headers.
 * Walks X-Forwarded-For right→left (rightmost is appended by our own proxy and
 * can't be spoofed), skipping any hops listed in TRUSTED_PROXIES.
 */
export function clientIpFromHeaders(h) {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (let i = hops.length - 1; i >= 0; i--) {
      if (!TRUSTED_PROXIES.has(hops[i])) return hops[i];
    }
  }
  return h.get("x-real-ip") || "0.0.0.0";
}

export async function getClientIp() {
  return clientIpFromHeaders(await headers());
}
