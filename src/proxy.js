import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Proxy (formerly middleware) — cheap, optimistic checks only:
 *  1. Coarse per-IP rate limit (in-memory, per process) as a first line of defence.
 *     Fine-grained, durable limits live in src/lib/rate-limit.js and Better Auth.
 *  2. Redirect visitors without a session cookie away from /account and /admin.
 *     Real authorization is enforced again in the Data Access Layer (src/lib/session.js).
 */

const WINDOW_MS = 60_000;
const LIMITS = { read: 300, write: 60 }; // requests per IP per minute
const MAX_TRACKED_IPS = 10_000;
const buckets = new Map();

function clientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",").at(-1).trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function hit(key, limit) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_IPS) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
      if (buckets.size >= MAX_TRACKED_IPS) buckets.delete(buckets.keys().next().value);
    }
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, b);
  }
  b.count += 1;
  return { ok: b.count <= limit, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Webhooks come from payment providers' IPs and are verified by signature.
  if (!pathname.startsWith("/api/webhooks/") && !pathname.startsWith("/api/v1/webhooks/")) {
    const isWrite = request.method !== "GET" && request.method !== "HEAD";
    const kind = isWrite ? "write" : "read";
    const rl = hit(`${kind}:${clientIp(request)}`, LIMITS[kind]);
    if (!rl.ok) {
      return new NextResponse("Too many requests. Please slow down.", {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter), "Content-Type": "text/plain" },
      });
    }
  }

  const hasSession = Boolean(getSessionCookie(request, { cookiePrefix: "hz" }));

  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !hasSession) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/account") && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip static assets and image optimisation.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?)$).*)",
  ],
};
