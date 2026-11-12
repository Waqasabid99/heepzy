import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { db } from "@/lib/db";
import { env, isProd } from "@/lib/env";

const trustedProxies = (process.env.TRUSTED_PROXIES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const auth = betterAuth({
  appName: "Heepzy",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
  database: prismaAdapter(db, { provider: "mysql" }),
  telemetry: { enabled: false },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    // TODO(email): wire to the mailer once SMTP is configured.
    // sendResetPassword: async ({ user, url }) => sendPasswordResetEmail(user.email, url),
  },

  user: {
    additionalFields: {
      phone: { type: "string", required: false, input: true },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 days
    updateAge: 60 * 60 * 24, // refresh expiry at most once a day
    freshAge: 60 * 15, // sensitive actions need a login within the last 15 min
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60 * 10, max: 5 },
      "/request-password-reset": { window: 60 * 10, max: 3 },
      "/reset-password": { window: 60 * 10, max: 5 },
      "/change-password": { window: 60 * 10, max: 5 },
    },
  },

  advanced: {
    useSecureCookies: isProd,
    cookiePrefix: "hz",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: isProd },
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
      ...(trustedProxies.length ? { trustedProxies } : {}),
    },
  },

  plugins: [
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    // Must be last: lets server actions set auth cookies.
    nextCookies(),
  ],
});
