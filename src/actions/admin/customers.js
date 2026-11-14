"use server";

import { randomBytes } from "node:crypto";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireOwner, requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { normalizePhone } from "@/lib/phone";
import { canonicalCity } from "@/lib/pk-cities";
import { PROVINCES } from "@/lib/checkout";
import { isOwner, isStaff, ROLE_LABELS, ROLES } from "@/lib/roles";

const banSchema = z.object({
  userId: z.string().min(1).max(64),
  intent: z.enum(["ban", "unban"]),
  reason: z.string().trim().max(255).default(""),
});

/**
 * Block or unblock a customer account. Blocking signs them out everywhere and
 * stops new sign-ins; their orders are untouched. useActionState-compatible.
 */
export async function setCustomerBan(_prev, formData) {
  const admin = await requireStaff();
  const parsed = banSchema.safeParse({
    userId: formData.get("userId"),
    intent: formData.get("intent"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const { userId, intent, reason } = parsed.data;

  if (userId === admin.id) return { ok: false, message: "You can't block your own account." };
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true, banned: true } });
  if (!user) return { ok: false, message: "Customer not found." };
  // Managers can't touch staff; the owner can block managers but not another owner.
  if (user.role === "admin") return { ok: false, message: "Admin (owner) accounts can't be blocked." };
  if (isStaff(user.role) && !isOwner(admin.role)) {
    return { ok: false, message: "Only the owner can block staff accounts." };
  }

  if (intent === "ban") {
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { banned: true, banReason: reason || "Blocked by admin", banExpires: null },
      }),
      db.session.deleteMany({ where: { userId } }),
    ]);
    await audit({ actorId: admin.id, action: "customer.ban", entity: "User", entityId: userId, metadata: { reason } });
    refresh();
    return { ok: true, message: "Account blocked and signed out on all devices." };
  }

  await db.user.update({ where: { id: userId }, data: { banned: false, banReason: null, banExpires: null } });
  await audit({ actorId: admin.id, action: "customer.unban", entity: "User", entityId: userId });
  refresh();
  return { ok: true, message: "Account unblocked. They can sign in again." };
}

const phoneField = z.string().transform((v, ctx) => {
  const p = normalizePhone(v);
  if (!p) ctx.addIssue({ code: "custom", message: "Enter a Pakistani mobile number, e.g. 0300 1234567" });
  return p ?? "";
});

const customerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the customer's name").max(120),
    email: z
      .email("Enter a valid email address")
      .max(191)
      .transform((s) => s.toLowerCase()),
    phone: z.union([z.literal(""), phoneField]),
    password: z.union([z.literal(""), z.string().min(8, "At least 8 characters").max(128, "At most 128 characters")]),
    role: z.enum(ROLES),
    confirmStaff: z.boolean(),
    addAddress: z.boolean(),
    fullName: z.string().trim().max(120).default(""),
    addressPhone: z.string().default(""),
    line1: z.string().trim().max(255).default(""),
    line2: z.string().trim().max(255).default(""),
    city: z.string().trim().max(80).default(""),
    province: z.string().default(""),
    postalCode: z.union([z.literal(""), z.string().regex(/^\d{5}$/, "Postal code is 5 digits")]).default(""),
  })
  .superRefine((c, ctx) => {
    if (isStaff(c.role) && !c.confirmStaff) {
      ctx.addIssue({ code: "custom", path: ["confirmStaff"], message: "Tick the box to confirm staff access" });
    }
    if (!c.addAddress) return;
    if (c.line1.length < 5)
      ctx.addIssue({ code: "custom", path: ["line1"], message: "Enter the house/street address" });
    if (!Object.hasOwn(PROVINCES, c.province))
      ctx.addIssue({ code: "custom", path: ["province"], message: "Choose the province" });
    if (c.city.length < 2) ctx.addIssue({ code: "custom", path: ["city"], message: "Choose the city" });
    if (!normalizePhone(c.addressPhone || c.phone)) {
      ctx.addIssue({ code: "custom", path: ["addressPhone"], message: "Enter a mobile number for delivery" });
    }
  });

/**
 * Create a customer (or staff) account from the admin panel, optionally with a
 * saved delivery address. useActionState-compatible; redirects on success.
 */
export async function createCustomer(_prev, formData) {
  const admin = await requireStaff();
  const text = (k) => String(formData.get(k) ?? "");
  const parsed = customerSchema.safeParse({
    name: text("name"),
    email: text("email").trim(),
    phone: text("phone"),
    password: text("password"),
    role: text("role") || "user",
    confirmStaff: formData.get("confirmStaff") === "on",
    addAddress: formData.get("addAddress") === "on",
    fullName: text("fullName"),
    addressPhone: text("addressPhone"),
    line1: text("line1"),
    line2: text("line2"),
    city: text("city"),
    province: text("province"),
    postalCode: text("postalCode"),
  });
  const fail = (errors, message = null) => ({ ok: false, message, errors });
  if (!parsed.success) {
    const errors = {};
    for (const i of parsed.error.issues) errors[i.path[0] ?? "form"] ??= i.message;
    return fail(errors);
  }
  const c = parsed.data;
  if (isStaff(c.role) && !isOwner(admin.role)) return fail({}, "Only the owner can create staff accounts.");
  if (await db.user.findUnique({ where: { email: c.email }, select: { id: true } })) {
    return fail({ email: "An account with this email already exists" });
  }

  // Created through Better Auth's internals (the same steps as its admin plugin),
  // so managers can add customers without access to the plugin's staff endpoints.
  let userId;
  try {
    const ctx = await auth.$context;
    const user = await ctx.internalAdapter.createUser({
      email: c.email,
      name: c.name,
      emailVerified: false,
      role: c.role,
      phone: c.phone || null,
    });
    // Without a password the account still gets one (random, unknown to anyone),
    // so the customer can set their own later with "Forgot password".
    await ctx.internalAdapter.linkAccount({
      providerId: "credential",
      accountId: user.id,
      userId: user.id,
      password: await ctx.password.hash(c.password || randomBytes(24).toString("base64url")),
    });
    userId = user.id;
  } catch (err) {
    console.error("[customers] create failed", err);
    return fail({}, "Couldn't create the account. Please try again.");
  }

  if (c.addAddress) {
    await db.address.create({
      data: {
        userId,
        label: "Home",
        fullName: c.fullName || c.name,
        phone: normalizePhone(c.addressPhone || c.phone),
        line1: c.line1,
        line2: c.line2 || null,
        city: canonicalCity(c.province, c.city) ?? c.city,
        province: c.province,
        postalCode: c.postalCode || null,
        isDefault: true,
      },
    });
  }
  await audit({
    actorId: admin.id,
    action: "customer.create",
    entity: "User",
    entityId: userId,
    metadata: { role: c.role, withPassword: Boolean(c.password) },
  });
  redirect(`/admin/customers/${userId}?created=1`);
}

/**
 * Owner only: change someone's role (customer, manager, admin). Signs them out
 * everywhere so the new access applies straight away.
 */
export async function setUserRole(_prev, formData) {
  const owner = await requireOwner();
  const parsed = z.object({ userId: z.string().min(1).max(64), role: z.enum(ROLES), confirm: z.boolean() }).safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    confirm: formData.get("confirm") === "on",
  });
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const { userId, role, confirm } = parsed.data;
  if (userId === owner.id) return { ok: false, message: "You can't change your own role." };
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) return { ok: false, message: "Account not found." };
  if (user.role === role) return { ok: true, message: "No change." };
  if (isStaff(role) && !confirm) return { ok: false, message: "Tick the box to confirm staff access." };

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { role } }),
    db.session.deleteMany({ where: { userId } }),
  ]);
  await audit({
    actorId: owner.id,
    action: "user.role",
    entity: "User",
    entityId: userId,
    metadata: { from: user.role, to: role },
  });
  refresh();
  return { ok: true, message: `Role changed to ${ROLE_LABELS[role]}. They've been signed out to apply it.` };
}
