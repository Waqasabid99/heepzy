import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Encrypt small secrets (payment gateway keys) before they go into the
 * database, so a leaked backup doesn't leak the keys. AES-256-GCM with a key
 * from SECRETS_ENCRYPTION_KEY, or derived from BETTER_AUTH_SECRET if unset.
 *
 * Format: "v1.<iv>.<tag>.<ciphertext>" (base64url). `context` is bound as
 * associated data, so a value can't be swapped into another field.
 */
let cached;
function key() {
  cached ??= Buffer.from(
    hkdfSync(
      "sha256",
      env.SECRETS_ENCRYPTION_KEY ?? env.BETTER_AUTH_SECRET,
      "heepzy",
      env.SECRETS_ENCRYPTION_KEY ? "secret-box" : "secret-box:from-auth-secret",
      32,
    ),
  );
  return cached;
}

export function seal(plain, context) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  c.setAAD(Buffer.from(context));
  const ct = Buffer.concat([c.update(String(plain), "utf8"), c.final()]);
  return ["v1", iv, c.getAuthTag(), ct].map((p) => (typeof p === "string" ? p : p.toString("base64url"))).join(".");
}

/** Returns the plain text, or null if it can't be decrypted (wrong key, tampered). */
export function open(sealed, context) {
  try {
    const [v, iv, tag, ct] = String(sealed).split(".");
    if (v !== "v1") return null;
    const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    d.setAAD(Buffer.from(context));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** "…4f2a" style hint for showing that a secret is set without revealing it. */
export const hintOf = (s) => String(s).slice(-4);
