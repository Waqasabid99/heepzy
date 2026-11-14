import "server-only";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/request";

/**
 * Fixed-window rate limiter backed by MySQL, so limits hold across restarts and
 * multiple Node processes (no Redis on Hostinger shared hosting).
 * The upsert is a single atomic statement.
 *
 * Usage in a server action / route handler:
 *   const rl = await rateLimit("checkout", { limit: 10, windowSec: 600 });
 *   if (!rl.ok) return { error: "Too many attempts. Try again later." };
 */
export async function rateLimit(name, { limit, windowSec, key } = {}) {
  const id = `${name}:${key ?? (await getClientIp())}`.slice(0, 191);
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSec * 1000);

  await db.$executeRaw`
    INSERT INTO rate_limit_buckets (\`key\`, \`count\`, resetAt)
    VALUES (${id}, 1, ${resetAt})
    ON DUPLICATE KEY UPDATE
      \`count\`  = IF(resetAt <= ${now}, 1, \`count\` + 1),
      resetAt    = IF(resetAt <= ${now}, ${resetAt}, resetAt)`;

  const row = await db.rateLimitBucket.findUnique({ where: { key: id } });
  const remaining = Math.max(0, limit - (row?.count ?? 0));
  return {
    ok: (row?.count ?? 0) <= limit,
    remaining,
    resetAt: row?.resetAt ?? resetAt,
  };
}

/** Preset limits for common actions — tune here, not at call sites. */
export const LIMITS = {
  checkout: { limit: 10, windowSec: 10 * 60 },
  applyCoupon: { limit: 15, windowSec: 10 * 60 },
  review: { limit: 5, windowSec: 60 * 60 },
  returnRequest: { limit: 5, windowSec: 60 * 60 },
  returnMedia: { limit: 30, windowSec: 60 * 60 },
  paymentKeys: { limit: 10, windowSec: 15 * 60 },
  guestOrderLookup: { limit: 10, windowSec: 15 * 60 },
  newsletter: { limit: 5, windowSec: 60 * 60 },
  contact: { limit: 5, windowSec: 60 * 60 },
};

/** Delete expired buckets. Call from a cron/maintenance route. */
export function purgeExpiredBuckets() {
  return db.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date() } } });
}
