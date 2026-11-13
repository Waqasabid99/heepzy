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
  PAYSAFE_ENV: z.enum(["TEST", "LIVE"]).default("TEST"),
  PAYSAFE_API_KEY_USERNAME: z.string().optional(),
  PAYSAFE_API_KEY_PASSWORD: z.string().optional(),
  PAYSAFE_ACCOUNT_ID: z.string().optional(),
  PAYSAFE_WEBHOOK_HMAC_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  // Where uploaded images are written (served by /media/*). Keep it outside the build output.
  UPLOAD_DIR: z.string().default("storage/uploads"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
