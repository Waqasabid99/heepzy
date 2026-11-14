"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { SETTINGS_TAG } from "@/lib/settings";
import { CATALOG_TAG } from "@/lib/catalog";
import { PROVINCES } from "@/lib/checkout";
import { normalizePhone } from "@/lib/phone";
import { safepayConfigured } from "@/lib/payments/safepay";

/**
 * Store settings (Admin → Settings). Staff (owner or manager) can edit.
 * Every save expires the cached settings so the storefront updates at once.
 */

const money = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 5000");
const optionalMoney = z.union([z.literal(""), money]).transform((v) => (v === "" ? null : v));
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
const bool = (fd, k) => fd.get(k) === "on";
const text = (fd, k) => String(fd.get(k) ?? "");

function issues(error) {
  const errors = {};
  for (const i of error.issues) errors[i.path[0] ?? "form"] ??= i.message;
  return { ok: false, errors };
}

async function saved(adminId, section, changes) {
  await audit({
    actorId: adminId,
    action: `settings.${section}`,
    entity: "StoreSettings",
    entityId: "1",
    metadata: changes,
  });
  updateTag(SETTINGS_TAG);
  updateTag(CATALOG_TAG); // pages that show perks/prices with settings baked in
  refresh();
  return { ok: true, message: "Settings saved. The store is updated." };
}

const upsert = (data) => db.storeSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });

// ─── Store ─────────────────────────────────────────────────────

const storeSchema = z.object({
  storeName: z.string().trim().min(2, "Enter the store name").max(120),
  supportEmail: z.union([z.literal(""), z.email("Enter a valid email address").max(191)]).transform((v) => v || null),
  supportPhone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => !v || normalizePhone(v) || /^0\d{9,10}$/.test(v.replace(/\D/g, "")), "Enter a valid phone number")
    .transform((v) => v || null),
  whatsappNumber: z
    .string()
    .trim()
    .max(20)
    .transform((v, ctx) => {
      if (!v) return null;
      const local = normalizePhone(v);
      if (!local) {
        ctx.addIssue({ code: "custom", message: "Enter a Pakistani mobile number, e.g. 0300 1234567" });
        return null;
      }
      return `92${local.slice(1)}`; // wa.me needs the international form
    }),
  announcementText: optionalText(200),
  announcementLink: z
    .string()
    .trim()
    .max(255)
    .refine((v) => !v || (v.startsWith("/") && !v.startsWith("//")), "Use a page on this site, starting with /")
    .transform((v) => v || null),
  guestCheckoutEnabled: z.boolean(),
  reviewsEnabled: z.boolean(),
  reviewsRequireApproval: z.boolean(),
  lowStockThreshold: z.coerce.number().int("Whole number").min(0, "0 or more").max(1000),
  maintenanceMode: z.boolean(),
});

export async function saveStoreSettings(_prev, fd) {
  const admin = await requireStaff();
  const parsed = storeSchema.safeParse({
    storeName: text(fd, "storeName"),
    supportEmail: text(fd, "supportEmail"),
    supportPhone: text(fd, "supportPhone"),
    whatsappNumber: text(fd, "whatsappNumber"),
    announcementText: text(fd, "announcementText"),
    announcementLink: text(fd, "announcementLink"),
    guestCheckoutEnabled: bool(fd, "guestCheckoutEnabled"),
    reviewsEnabled: bool(fd, "reviewsEnabled"),
    reviewsRequireApproval: bool(fd, "reviewsRequireApproval"),
    lowStockThreshold: text(fd, "lowStockThreshold") || "5",
    maintenanceMode: bool(fd, "maintenanceMode"),
  });
  if (!parsed.success) return issues(parsed.error);
  await upsert(parsed.data);
  return saved(admin.id, "store", Object.keys(parsed.data));
}

// ─── Payments ──────────────────────────────────────────────────

export async function savePaymentSettings(_prev, fd) {
  const admin = await requireStaff();
  const parsed = z
    .object({ codEnabled: z.boolean(), codMaxOrderAmount: optionalMoney, cardPaymentsEnabled: z.boolean() })
    .superRefine((p, ctx) => {
      if (!p.codEnabled && !p.cardPaymentsEnabled) {
        ctx.addIssue({ code: "custom", path: ["codEnabled"], message: "Keep at least one way to pay switched on" });
      }
    })
    .safeParse({
      codEnabled: bool(fd, "codEnabled"),
      codMaxOrderAmount: text(fd, "codMaxOrderAmount"),
      cardPaymentsEnabled: bool(fd, "cardPaymentsEnabled"),
    });
  if (!parsed.success) return issues(parsed.error);
  if (parsed.data.cardPaymentsEnabled && !(await safepayConfigured())) {
    return { ok: false, errors: { cardPaymentsEnabled: "Add the Safepay keys first" } };
  }
  await upsert(parsed.data);
  return saved(admin.id, "payments", parsed.data);
}

// ─── Returns ───────────────────────────────────────────────────

export async function saveReturnSettings(_prev, fd) {
  const admin = await requireStaff();
  const parsed = z
    .object({
      returnsEnabled: z.boolean(),
      refundsEnabled: z.boolean(),
      returnWindowDays: z.coerce.number().int("Whole days").min(1, "At least 1 day").max(90, "At most 90 days"),
      returnPolicy: optionalText(10_000),
    })
    .safeParse({
      returnsEnabled: bool(fd, "returnsEnabled"),
      refundsEnabled: bool(fd, "refundsEnabled"),
      returnWindowDays: text(fd, "returnWindowDays") || "7",
      returnPolicy: text(fd, "returnPolicy"),
    });
  if (!parsed.success) return issues(parsed.error);
  await upsert(parsed.data);
  return saved(admin.id, "returns", { ...parsed.data, returnPolicy: parsed.data.returnPolicy ? "(updated)" : null });
}

// ─── Tax ───────────────────────────────────────────────────────

export async function saveTaxMode(_prev, fd) {
  const admin = await requireStaff();
  const pricesIncludeTax = fd.get("pricesIncludeTax") === "included";
  await upsert({ pricesIncludeTax });
  return saved(admin.id, "tax", { pricesIncludeTax });
}

const taxRateSchema = z.object({
  id: z.union([z.literal(""), z.string().min(10).max(40)]),
  name: z.string().trim().min(2, "Enter a name, e.g. GST").max(80),
  rate: z
    .string()
    .trim()
    .regex(/^\d{1,2}(\.\d{1,2})?$/, "Enter a percentage, e.g. 18"),
  province: z.union([z.literal(""), z.enum(Object.keys(PROVINCES))]).transform((v) => v || null),
  priority: z.coerce.number().int().min(0).max(100),
  isActive: z.boolean(),
});

export async function saveTaxRate(_prev, fd) {
  const admin = await requireStaff();
  const parsed = taxRateSchema.safeParse({
    id: text(fd, "id"),
    name: text(fd, "name"),
    rate: text(fd, "rate"),
    province: text(fd, "province"),
    priority: text(fd, "priority") || "0",
    isActive: bool(fd, "isActive"),
  });
  if (!parsed.success) return issues(parsed.error);
  const { id, ...data } = parsed.data;
  const row = id
    ? await db.taxRate.update({ where: { id }, data }).catch(() => null)
    : await db.taxRate.create({ data });
  if (!row) return { ok: false, message: "That tax rate no longer exists." };
  await audit({
    actorId: admin.id,
    action: id ? "tax.update" : "tax.create",
    entity: "TaxRate",
    entityId: row.id,
    metadata: data,
  });
  refresh();
  return { ok: true, message: id ? "Tax rate saved." : "Tax rate added." };
}

export async function deleteTaxRate(id) {
  const admin = await requireStaff();
  if (typeof id !== "string" || id.length > 40) return { ok: false, message: "Invalid request." };
  const res = await db.taxRate.deleteMany({ where: { id } });
  if (!res.count) return { ok: false, message: "Already removed." };
  await audit({ actorId: admin.id, action: "tax.delete", entity: "TaxRate", entityId: id });
  refresh();
  return { ok: true, message: "Tax rate removed." };
}

// ─── Delivery ──────────────────────────────────────────────────

export async function saveFreeDelivery(_prev, fd) {
  const admin = await requireStaff();
  const parsed = z
    .object({ freeDeliveryEnabled: z.boolean(), freeDeliveryThreshold: optionalMoney })
    .superRefine((p, ctx) => {
      if (p.freeDeliveryEnabled && !p.freeDeliveryThreshold) {
        ctx.addIssue({
          code: "custom",
          path: ["freeDeliveryThreshold"],
          message: "Enter the order amount for free delivery",
        });
      }
    })
    .safeParse({
      freeDeliveryEnabled: bool(fd, "freeDeliveryEnabled"),
      freeDeliveryThreshold: text(fd, "freeDeliveryThreshold"),
    });
  if (!parsed.success) return issues(parsed.error);
  await upsert(parsed.data);
  return saved(admin.id, "delivery", parsed.data);
}

const rateSchema = z
  .object({
    id: z.string().max(40).default(""),
    name: z.string().trim().min(2, "Name each rate, e.g. Standard").max(80),
    price: money,
    codFee: optionalMoney,
    freeAboveAmount: optionalMoney,
    minOrderAmount: optionalMoney,
    estimatedDaysMin: z
      .union([z.literal(""), z.coerce.number().int().min(0).max(60)])
      .transform((v) => (v === "" ? null : v)),
    estimatedDaysMax: z
      .union([z.literal(""), z.coerce.number().int().min(0).max(60)])
      .transform((v) => (v === "" ? null : v)),
    isActive: z.boolean().default(true),
  })
  .superRefine((r, ctx) => {
    if (r.estimatedDaysMin != null && r.estimatedDaysMax != null && r.estimatedDaysMin > r.estimatedDaysMax) {
      ctx.addIssue({ code: "custom", path: ["estimatedDaysMax"], message: "Max days must be at least min days" });
    }
  });

const zoneSchema = z.object({
  id: z.string().max(40).default(""),
  name: z.string().trim().min(2, "Name the zone, e.g. Major cities").max(80),
  provinces: z.array(z.enum(Object.keys(PROVINCES))).max(10),
  cities: z
    .array(z.string().trim().min(2).max(80))
    .max(300)
    .transform((list) => [...new Set(list.map((c) => c.toLowerCase()))]),
  isDefault: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(1000),
  isActive: z.boolean(),
  rates: z.array(rateSchema).min(1, "Add at least one delivery rate").max(10),
});

/** Create or update a zone with its rates (rates not in the list are removed). */
export async function saveDeliveryZone(input) {
  const admin = await requireStaff();
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) {
    const errors = {};
    for (const i of parsed.error.issues) {
      const [k, idx, field] = i.path;
      const key = k === "rates" && typeof idx === "number" ? `rates.${idx}.${field ?? "name"}` : (k ?? "form");
      errors[key] ??= i.message;
    }
    return { ok: false, errors };
  }
  const z0 = parsed.data;
  if (!z0.isDefault && !z0.provinces.length && !z0.cities.length) {
    return { ok: false, errors: { provinces: "Pick provinces or cities, or make this the default zone" } };
  }
  const zoneData = {
    name: z0.name,
    provinces: z0.provinces,
    cities: z0.cities,
    isDefault: z0.isDefault,
    sortOrder: z0.sortOrder,
    isActive: z0.isActive,
  };
  const rateData = (r) => ({
    name: r.name,
    price: r.price,
    codFee: r.codFee,
    freeAboveAmount: r.freeAboveAmount,
    minOrderAmount: r.minOrderAmount,
    estimatedDaysMin: r.estimatedDaysMin,
    estimatedDaysMax: r.estimatedDaysMax,
    isActive: r.isActive,
  });

  const zoneId = await db.$transaction(async (tx) => {
    if (z0.isDefault) await tx.deliveryZone.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    let zone;
    if (z0.id) {
      zone = await tx.deliveryZone.update({
        where: { id: z0.id },
        data: zoneData,
        include: { rates: { select: { id: true } } },
      });
      const keep = z0.rates.filter((r) => r.id && zone.rates.some((x) => x.id === r.id)).map((r) => r.id);
      // Orders keep the rate's name as text, so removing a rate never breaks history.
      await tx.deliveryRate.deleteMany({ where: { zoneId: zone.id, id: { notIn: keep } } });
      for (const r of z0.rates) {
        if (keep.includes(r.id)) await tx.deliveryRate.update({ where: { id: r.id }, data: rateData(r) });
        else await tx.deliveryRate.create({ data: { zoneId: zone.id, ...rateData(r) } });
      }
    } else {
      zone = await tx.deliveryZone.create({
        data: { ...zoneData, rates: { create: z0.rates.map(rateData) } },
      });
    }
    return zone.id;
  });
  await audit({
    actorId: admin.id,
    action: z0.id ? "delivery.zone.update" : "delivery.zone.create",
    entity: "DeliveryZone",
    entityId: zoneId,
    metadata: { name: z0.name, rates: z0.rates.length },
  });
  refresh();
  return { ok: true, message: z0.id ? "Zone saved." : "Zone added." };
}

export async function deleteDeliveryZone(id) {
  const admin = await requireStaff();
  if (typeof id !== "string" || id.length > 40) return { ok: false, message: "Invalid request." };
  const zone = await db.deliveryZone.findUnique({ where: { id }, select: { name: true, isDefault: true } });
  if (!zone) return { ok: false, message: "Already removed." };
  if (zone.isDefault) return { ok: false, message: "Make another zone the default before removing this one." };
  await db.deliveryZone.delete({ where: { id } });
  await audit({
    actorId: admin.id,
    action: "delivery.zone.delete",
    entity: "DeliveryZone",
    entityId: id,
    metadata: { name: zone.name },
  });
  refresh();
  return { ok: true, message: "Zone removed." };
}
