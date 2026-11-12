import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env, isProd } from "@/lib/env";

/** Guest cart cookie: `<token>.<hmac>` — tamper-evident, httpOnly, never readable by JS. */
export const CART_COOKIE = isProd ? "__Host-hz_cart" : "hz_cart";
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function sign(token) {
  return createHmac("sha256", env.CART_COOKIE_SECRET).update(token).digest("base64url");
}

export function createCartToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, cookieValue: `${token}.${sign(token)}` };
}

/** Returns the raw token if the signature is valid, otherwise null. */
export function verifyCartCookie(value) {
  if (!value || typeof value !== "string") return null;
  const [token, mac] = value.split(".");
  if (!token || !mac) return null;
  const expected = Buffer.from(sign(token));
  const actual = Buffer.from(mac);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return token;
}

export const cartCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
  maxAge: CART_COOKIE_MAX_AGE,
};
