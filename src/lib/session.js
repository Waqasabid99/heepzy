import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect, forbidden, unauthorized } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Data Access Layer for authentication. Every server-side authorization check
 * goes through here; the proxy only does cheap optimistic redirects.
 *
 * Reading the session reads request headers, so callers must render behind a
 * <Suspense> boundary when Cache Components is enabled.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Narrow, client-safe view of the current user (or null). */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.user || session.user.banned) return null;
  const { id, name, email, image, role } = session.user;
  return { id, name, email, image, role };
});

export async function requireUser(redirectTo = "/login") {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user;
}

/** For admin pages: redirects anonymous users to the admin login. */
export async function requireAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "admin") forbidden();
  return user;
}

/** For admin server actions / route handlers: never redirect, just refuse. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) unauthorized();
  if (user.role !== "admin") forbidden();
  return user;
}
