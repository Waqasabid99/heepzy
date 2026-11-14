import "server-only";
import { z } from "zod";

/**
 * Validated server environment. Importing this module fails fast at boot
 * if a required secret is missing or malformed, instead of failing later
 * in the middle of a request.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.url(),
  DATABASE_URL: z.string().startsWith("mysql://"),
  DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(5),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 chars"),
  BETTER_AUTH_URL: z.url(),
  CART_COOKIE_SECRET: z.string().min(32, "CART_COOKIE_SECRET must be at least 32 chars"),
  // Safepay (Pakistan) — cards & wallets. Keys: Safepay dashboard → Developers.
  SAFEPAY_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  NEXT_PUBLIC_SAFEPAY_PUBLIC_KEY: z.string().optional(),
  SAFEPAY_SECRET_KEY: z.string().optional(),
  SAFEPAY_WEBHOOK_SHARED_SECRET_KEY: z.string().optional(),
  // Encrypts payment keys saved in the admin (falls back to a key derived from
  // BETTER_AUTH_SECRET). Changing it makes saved keys unreadable: re-enter them.
  SECRETS_ENCRYPTION_KEY: z.preprocess(
    (v) => v || undefined,
    z.string().min(32, "SECRETS_ENCRYPTION_KEY must be at least 32 chars").optional(),
  ),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  // Where uploaded images go. "auto" = Vercel Blob when BLOB_READ_WRITE_TOKEN is set, otherwise local disk.
  STORAGE_DRIVER: z.enum(["auto", "disk", "blob"]).default("auto"),
  // Local disk (served by /media/*). Keep it outside the build output.
  UPLOAD_DIR: z.string().default("storage/uploads"),
  // Vercel Blob (Storage tab in the Vercel project; the token is added for you).
  BLOB_READ_WRITE_TOKEN: z.preprocess((v) => v || undefined, z.string().optional()),
  // "true" = connect to the database over TLS (TiDB Cloud and most hosted MySQL need it).
  // A `?ssl=true` or `?sslaccept=strict` on DATABASE_URL has the same effect.
  DATABASE_SSL: z.preprocess((v) => v || undefined, z.enum(["true", "false"]).optional()),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
