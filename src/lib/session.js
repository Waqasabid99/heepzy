import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect, forbidden, unauthorized } from "next/navigation";
import { auth } from "@/lib/auth";
import { isOwner, isStaff } from "@/lib/roles";

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

/** For admin pages: staff (admin or manager). Redirects anonymous users to the admin login. */
export async function requireStaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!isStaff(user.role)) forbidden();
  return user;
}

/** For owner-only admin pages (staff management, audit log). */
export async function requireOwnerPage() {
  const user = await requireStaffPage();
  if (!isOwner(user.role)) forbidden();
  return user;
}

/** For admin server actions / route handlers: staff only. Never redirects, just refuses. */
export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) unauthorized();
  if (!isStaff(user.role)) forbidden();
  return user;
}

/** For owner-only server actions (roles, staff accounts). */
export async function requireOwner() {
  const user = await requireStaff();
  if (!isOwner(user.role)) forbidden();
  return user;
}
