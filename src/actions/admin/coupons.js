"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { fromPktInput } from "@/lib/pkt";
import { readScope, scopeRelations, validScope } from "@/lib/admin/scope";

const money = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 500 or 499.50");
const optionalMoney = z.union([z.literal(""), money]).transform((v) => (v === "" ? null : v));
const optionalCount = z
  .union([z.literal(""), z.coerce.number().int("Whole numbers only").min(1, "At least 1").max(1_000_000)])
  .transform((v) => (v === "" ? null : v));
const when = z
  .string()
  .default("")
  .refine((v) => v === "" || fromPktInput(v), "Enter a valid date and time")
  .transform((v) => fromPktInput(v));

const couponSchema = z
  .object({
    id: z.union([z.literal(""), z.string().min(10).max(40)]).default(""),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,40}$/, "3–40 letters, numbers, dashes or underscores, no spaces"),
    description: z.string().trim().max(255).default(""),
    type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"], { error: "Choose a discount type" }),
    value: z.string().trim().default(""),
    minOrderAmount: optionalMoney,
    maxDiscountAmount: optionalMoney,
    usageLimit: optionalCount,
    usageLimitPerUser: optionalCount,
    firstOrderOnly: z.boolean(),
    isActive: z.boolean(),
    startsAt: when,
    endsAt: when,
  })
  .superRefine((c, ctx) => {
    const v = Number(c.value);
    if (c.type === "PERCENTAGE" && !(/^\d{1,3}(\.\d{1,2})?$/.test(c.value) && v > 0 && v <= 100)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Enter a percentage between 1 and 100" });
    }
    if (c.type === "FIXED_AMOUNT" && !(money.safeParse(c.value).success && v > 0)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Enter the amount off, e.g. 500" });
    }
    if (c.type === "FIXED_AMOUNT" && c.minOrderAmount && v > Number(c.minOrderAmount)) {
      ctx.addIssue({
        code: "custom",
        path: ["minOrderAmount"],
        message: "Should be at least the discount amount, or the voucher could make orders free",
      });
    }
    if (c.startsAt && c.endsAt && c.endsAt <= c.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Must be after the start" });
    }
  });

function readForm(fd) {
  const text = (k) => String(fd.get(k) ?? "");
  return {
    id: text("id"),
    code: text("code"),
    description: text("description"),
    type: text("type"),
    value: text("value"),
    minOrderAmount: text("minOrderAmount"),
    maxDiscountAmount: text("maxDiscountAmount"),
    usageLimit: text("usageLimit"),
    usageLimitPerUser: text("usageLimitPerUser"),
    firstOrderOnly: fd.get("firstOrderOnly") === "on",
    isActive: fd.get("isActive") === "on",
    startsAt: text("startsAt"),
    endsAt: text("endsAt"),
  };
}

/** Create or update a voucher. useActionState-compatible; redirects on success. */
export async function saveCoupon(_prev, formData) {
  const admin = await requireStaff();
  const raw = readForm(formData);
  const fail = (errors, message = null) => ({ ok: false, message, errors });
  const parsed = couponSchema.safeParse(raw);
  const errors = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[i.path[0] ?? "form"] ??= i.message;
  const scopeRaw = readScope(formData);
  if (!scopeRaw) errors.scope = "Invalid selection";
  if (Object.keys(errors).length) return fail(errors);

  const c = parsed.data;
  const scope = await validScope(scopeRaw);
  if (!scope.appliesToAll && !scope.productIds.length && !scope.categoryIds.length && !scope.brandIds.length) {
    return fail({ scope: "Pick at least one product, category or brand, or choose Every product" });
  }

  const existing = c.id ? await db.coupon.findUnique({ where: { id: c.id }, select: { id: true } }) : null;
  if (c.id && !existing) return fail({}, "This voucher no longer exists.");
  const taken = await db.coupon.findFirst({
    where: { code: c.code, NOT: { id: c.id || undefined } },
    select: { id: true },
  });
  if (taken) return fail({ code: "Another voucher already uses this code" });

  const data = {
    code: c.code,
    description: c.description || null,
    type: c.type,
    value: c.type === "FREE_SHIPPING" ? "0" : c.value,
    minOrderAmount: c.minOrderAmount,
    maxDiscountAmount: c.type === "PERCENTAGE" ? c.maxDiscountAmount : null,
    usageLimit: c.usageLimit,
    usageLimitPerUser: c.usageLimitPerUser,
    firstOrderOnly: c.firstOrderOnly,
    isActive: c.isActive,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
  };

  let id;
  try {
    if (existing) {
      await db.coupon.update({ where: { id: existing.id }, data: { ...data, ...scopeRelations(scope) } });
      id = existing.id;
    } else {
      id = (await db.coupon.create({ data: { ...data, ...scopeRelations(scope, { create: true }) } })).id;
    }
  } catch (err) {
    if (err?.code === "P2002") return fail({ code: "Another voucher already uses this code" });
    console.error("[coupons] save failed", err);
    return fail({}, "Couldn't save the voucher. Please try again.");
  }
  await audit({
    actorId: admin.id,
    action: existing ? "coupon.update" : "coupon.create",
    entity: "Coupon",
    entityId: id,
    metadata: { code: c.code },
  });
  redirect(`/admin/coupons/${id}?${existing ? "saved" : "created"}=1`);
}

/** Switch a voucher on or off. */
export async function setCouponActive(id, isActive) {
  const admin = await requireStaff();
  if (typeof id !== "string" || id.length > 40) return { ok: false, message: "Invalid request." };
  const res = await db.coupon.updateMany({ where: { id }, data: { isActive: Boolean(isActive) } });
  if (!res.count) return { ok: false, message: "Voucher not found." };
  await audit({
    actorId: admin.id,
    action: isActive ? "coupon.enable" : "coupon.disable",
    entity: "Coupon",
    entityId: id,
  });
  refresh();
  return { ok: true, message: isActive ? "Voucher switched on." : "Voucher switched off." };
}

/** Delete a voucher that has never been used. Used vouchers are kept for order history. */
export async function deleteCoupon(id) {
  const admin = await requireStaff();
  if (typeof id !== "string" || id.length > 40) return { ok: false, message: "Invalid request." };
  const c = await db.coupon.findUnique({
    where: { id },
    select: { code: true, _count: { select: { redemptions: true } } },
  });
  if (!c) return { ok: false, message: "Voucher not found." };
  if (c._count.redemptions) {
    return { ok: false, message: "This voucher has been used on orders, so it's kept. Switch it off instead." };
  }
  await db.coupon.delete({ where: { id } });
  await audit({
    actorId: admin.id,
    action: "coupon.delete",
    entity: "Coupon",
    entityId: id,
    metadata: { code: c.code },
  });
  redirect("/admin/coupons?deleted=1");
}
