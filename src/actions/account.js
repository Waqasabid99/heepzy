"use server";

import { headers } from "next/headers";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone";
import { addressSchema, MAX_ADDRESSES } from "@/lib/addresses";

/** Customer's own account: profile, password, address book. */

function issues(error) {
  const errors = {};
  for (const i of error.issues) errors[i.path[0] ?? "form"] ??= i.message;
  return { ok: false, errors };
}

async function signedIn() {
  const user = await getCurrentUser();
  return user ?? null;
}
const signedOut = { ok: false, message: "Your session has ended. Please sign in again." };

export async function updateProfile(_prev, fd) {
  const user = await signedIn();
  if (!user) return signedOut;
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Enter your name").max(120),
      phone: z.string().transform((v, ctx) => {
        if (!v.trim()) return null;
        const p = normalizePhone(v);
        if (!p) ctx.addIssue({ code: "custom", message: "Enter a Pakistani mobile number, e.g. 0300 1234567" });
        return p;
      }),
    })
    .safeParse({ name: String(fd.get("name") ?? ""), phone: String(fd.get("phone") ?? "") });
  if (!parsed.success) return issues(parsed.error);
  // Through Better Auth so the session's cached copy of the user updates too.
  await auth.api.updateUser({ headers: await headers(), body: parsed.data });
  refresh();
  return { ok: true, message: "Saved." };
}

export async function changePassword(_prev, fd) {
  const user = await signedIn();
  if (!user) return signedOut;
  const rl = await rateLimit("changePassword", { ...LIMITS.changePassword, key: user.id });
  if (!rl.ok) return { ok: false, message: "Too many attempts. Please wait 15 minutes and try again." };
  const parsed = z
    .object({
      currentPassword: z.string().min(1, "Enter your current password").max(128),
      newPassword: z.string().min(8, "At least 8 characters").max(128, "At most 128 characters"),
      confirm: z.string(),
    })
    .refine((p) => p.newPassword === p.confirm, { path: ["confirm"], message: "The passwords don't match" })
    .refine((p) => p.newPassword !== p.currentPassword, {
      path: ["newPassword"],
      message: "Choose a password you haven't used here",
    })
    .safeParse({
      currentPassword: String(fd.get("currentPassword") ?? ""),
      newPassword: String(fd.get("newPassword") ?? ""),
      confirm: String(fd.get("confirm") ?? ""),
    });
  if (!parsed.success) return issues(parsed.error);
  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
    });
  } catch (err) {
    const code = err?.body?.code ?? "";
    if (/INVALID_PASSWORD|INVALID_EMAIL_OR_PASSWORD/.test(code)) {
      return { ok: false, errors: { currentPassword: "That isn't your current password" } };
    }
    console.error("[account] change password failed", code || err?.message);
    return { ok: false, message: "Couldn't change your password. Please try again." };
  }
  return { ok: true, message: "Password changed. You've been signed out on other devices." };
}

// ─── Address book ──────────────────────────────────────────────

const idSchema = z.string().min(10).max(40);

export async function saveAddress(_prev, fd) {
  const user = await signedIn();
  if (!user) return signedOut;
  const id = String(fd.get("id") ?? "");
  const parsed = addressSchema.safeParse({
    label: String(fd.get("label") ?? ""),
    fullName: String(fd.get("fullName") ?? ""),
    phone: String(fd.get("phone") ?? ""),
    line1: String(fd.get("line1") ?? ""),
    line2: String(fd.get("line2") ?? ""),
    province: fd.get("province") || undefined,
    city: String(fd.get("city") ?? ""),
    postalCode: String(fd.get("postalCode") ?? ""),
  });
  if (!parsed.success) return issues(parsed.error);
  const makeDefault = fd.get("isDefault") === "on";

  const count = await db.address.count({ where: { userId: user.id } });
  if (id) {
    if (!idSchema.safeParse(id).success) return { ok: false, message: "Address not found." };
    const own = await db.address.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!own) return { ok: false, message: "Address not found." };
  } else if (count >= MAX_ADDRESSES) {
    return { ok: false, message: `You can save up to ${MAX_ADDRESSES} addresses. Remove one first.` };
  }

  await db.$transaction(async (tx) => {
    const isDefault = makeDefault || count === 0;
    if (isDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    const data = { ...parsed.data, ...(isDefault ? { isDefault: true } : {}) };
    if (id) await tx.address.update({ where: { id }, data });
    else await tx.address.create({ data: { ...data, userId: user.id } });
  });
  refresh();
  return { ok: true, message: id ? "Address updated." : "Address added." };
}

export async function deleteAddress(id) {
  const user = await signedIn();
  if (!user) return signedOut;
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Address not found." };
  const address = await db.address.findFirst({ where: { id, userId: user.id }, select: { isDefault: true } });
  if (!address) return { ok: false, message: "Address not found." };
  await db.$transaction(async (tx) => {
    await tx.address.delete({ where: { id } });
    // Keep one default if any addresses remain.
    if (address.isDefault) {
      const next = await tx.address.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
  refresh();
  return { ok: true };
}

export async function setDefaultAddress(id) {
  const user = await signedIn();
  if (!user) return signedOut;
  if (!idSchema.safeParse(id).success) return { ok: false, message: "Address not found." };
  const own = await db.address.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!own) return { ok: false, message: "Address not found." };
  await db.$transaction([
    db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
    db.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  refresh();
  return { ok: true };
}
