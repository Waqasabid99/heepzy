"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { CATALOG_TAG } from "@/lib/catalog";
import { fromPktInput } from "@/lib/pkt";
import { slugify } from "@/lib/slug";
import { uniqueOfferSlug } from "@/lib/admin/promotions";
import { readScope, scopeRelations, validScope } from "@/lib/admin/scope";

const when = z
  .string()
  .default("")
  .refine((v) => v === "" || fromPktInput(v), "Enter a valid date and time")
  .transform((v) => fromPktInput(v));

const offerSchema = z
  .object({
    id: z.union([z.literal(""), z.string().min(10).max(40)]).default(""),
    name: z.string().trim().min(2, "Give the offer a name").max(120),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(140)
      .regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes"),
    description: z.string().trim().max(500).default(""),
    type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"], { error: "Choose a discount type" }),
    value: z.string().trim(),
    priority: z.coerce.number().int("Whole numbers only").min(0, "0 to 100").max(100, "0 to 100"),
    isActive: z.boolean(),
    startsAt: when,
    endsAt: when,
  })
  .superRefine((p, ctx) => {
    const v = Number(p.value);
    if (p.type === "PERCENTAGE" && !(/^\d{1,2}(\.\d{1,2})?$/.test(p.value) && v > 0 && v < 100)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Enter a percentage between 1 and 99" });
    }
    if (p.type === "FIXED_AMOUNT" && !(/^\d{1,10}(\.\d{1,2})?$/.test(p.value) && v > 0)) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Enter the amount off, e.g. 500" });
    }
    if (p.startsAt && p.endsAt && p.endsAt <= p.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Must be after the start" });
    }
  });

/** Create or update an offer. Storefront prices update immediately. Redirects on success. */
export async function saveOffer(_prev, formData) {
  const admin = await requireStaff();
  const text = (k) => String(formData.get(k) ?? "");
  const parsed = offerSchema.safeParse({
    id: text("id"),
    name: text("name"),
    slug: text("slug"),
    description: text("description"),
    type: text("type"),
    value: text("value"),
    priority: text("priority") || "0",
    isActive: formData.get("isActive") === "on",
    startsAt: text("startsAt"),
    endsAt: text("endsAt"),
  });
  const errors = {};
  if (!parsed.success) for (const i of parsed.error.issues) errors[i.path[0] ?? "form"] ??= i.message;
  const scopeRaw = readScope(formData);
  if (!scopeRaw) errors.scope = "Invalid selection";
  const fail = (e, message = null) => ({ ok: false, message, errors: e });
  if (Object.keys(errors).length) return fail(errors);

  const p = parsed.data;
  const scope = await validScope(scopeRaw);
  if (!scope.appliesToAll && !scope.productIds.length && !scope.categoryIds.length && !scope.brandIds.length) {
    return fail({ scope: "Pick at least one product, category or brand, or choose Every product" });
  }
  const existing = p.id ? await db.promotion.findUnique({ where: { id: p.id }, select: { id: true } }) : null;
  if (p.id && !existing) return fail({}, "This offer no longer exists.");

  let slug = p.slug;
  if (slug) {
    const taken = await db.promotion.findFirst({
      where: { slug, NOT: { id: p.id || undefined } },
      select: { id: true },
    });
    if (taken) return fail({ slug: `Another offer uses this link. Try “${await uniqueOfferSlug(slug, p.id)}”.` });
  } else {
    slug = await uniqueOfferSlug(slugify(p.name).slice(0, 120), p.id);
  }

  const data = {
    name: p.name,
    slug,
    description: p.description || null,
    type: p.type,
    value: p.value,
    priority: p.priority,
    isActive: p.isActive,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
  };
  let id;
  try {
    if (existing) {
      await db.promotion.update({ where: { id: existing.id }, data: { ...data, ...scopeRelations(scope) } });
      id = existing.id;
    } else {
      id = (await db.promotion.create({ data: { ...data, ...scopeRelations(scope, { create: true }) } })).id;
    }
  } catch (err) {
    if (err?.code === "P2002") return fail({ slug: "Another offer uses this link" });
    console.error("[offers] save failed", err);
    return fail({}, "Couldn't save the offer. Please try again.");
  }
  await audit({
    actorId: admin.id,
    action: existing ? "offer.update" : "offer.create",
    entity: "Promotion",
    entityId: id,
    metadata: { name: p.name, type: p.type, value: p.value },
  });
  updateTag(CATALOG_TAG);
  redirect(`/admin/promotions/${id}?${existing ? "saved" : "created"}=1`);
}

export async function setOfferActive(id, isActive) {
  const admin = await requireStaff();
  if (typeof id !== "string" || id.length > 40) return { ok: false, message: "Invalid request." };
  const res = await db.promotion.updateMany({ where: { id }, data: { isActive: Boolean(isActive) } });
  if (!res.count) return { ok: false, message: "Offer not found." };
  await audit({
    actorId: admin.id,
    action: isActive ? "offer.enable" : "offer.disable",
    entity: "Promotion",
    entityId: id,
  });
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true, message: isActive ? "Offer switched on." : "Offer switched off." };
}

/** Delete an offer. Past orders keep the prices they were sold at. */
export async function deleteOffer(id) {
  const admin = await requireStaff();
  if (typeof id !== "string" || id.length > 40) return { ok: false, message: "Invalid request." };
  const p = await db.promotion.findUnique({ where: { id }, select: { name: true } });
  if (!p) return { ok: false, message: "Offer not found." };
  await db.promotion.delete({ where: { id } });
  await audit({
    actorId: admin.id,
    action: "offer.delete",
    entity: "Promotion",
    entityId: id,
    metadata: { name: p.name },
  });
  updateTag(CATALOG_TAG);
  redirect("/admin/promotions?deleted=1");
}
