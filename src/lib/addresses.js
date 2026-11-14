import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { PROVINCES } from "@/lib/checkout";
import { normalizePhone } from "@/lib/phone";
import { canonicalCity } from "@/lib/pk-cities";

/** A customer's saved delivery address (account page, checkout prefill). */
export const MAX_ADDRESSES = 10;

export const addressSchema = z
  .object({
    label: z
      .string()
      .trim()
      .max(40, "Keep the label short")
      .transform((v) => v || null),
    fullName: z.string().trim().min(2, "Enter the recipient's full name").max(120),
    phone: z.string().transform((v, ctx) => {
      const p = normalizePhone(v);
      if (!p) ctx.addIssue({ code: "custom", message: "Enter a Pakistani mobile number, e.g. 0300 1234567" });
      return p ?? "";
    }),
    line1: z.string().trim().min(5, "Enter the house/street address").max(255),
    line2: z
      .string()
      .trim()
      .max(255)
      .transform((v) => v || null),
    province: z.enum(Object.keys(PROVINCES), { error: "Choose the province" }),
    city: z.string().trim().min(2, "Choose the city").max(80),
    postalCode: z
      .union([z.literal(""), z.string().regex(/^\d{5}$/, "Postal code is 5 digits")])
      .transform((v) => v || null),
  })
  .transform((a) => ({ ...a, city: canonicalCity(a.province, a.city) ?? a.city.replace(/\s+/g, " ") }));

const same = (a, b) =>
  a.line1.trim().toLowerCase() === b.line1.trim().toLowerCase() &&
  a.city.toLowerCase() === b.city.toLowerCase() &&
  a.phone === b.phone;

/**
 * Save an address used at checkout to the customer's account, unless it's
 * already there (or the address book is full). The first one becomes the default.
 */
export async function rememberAddress(userId, a) {
  const existing = await db.address.findMany({
    where: { userId },
    select: { line1: true, city: true, phone: true },
  });
  if (existing.length >= MAX_ADDRESSES || existing.some((x) => same(x, a))) return;
  await db.address.create({
    data: {
      userId,
      label: existing.length ? null : "Home",
      fullName: a.fullName,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2 || null,
      city: a.city,
      province: a.province,
      postalCode: a.postalCode || null,
      isDefault: existing.length === 0,
    },
  });
}
