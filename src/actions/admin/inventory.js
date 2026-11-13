"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { CATALOG_TAG } from "@/lib/catalog";
import { MANUAL_REASONS } from "@/lib/admin/inventory";

const adjustSchema = z.object({
  variantId: z.string().min(10).max(40),
  mode: z.enum(["add", "remove", "set"]),
  quantity: z.coerce
    .number({ error: "Enter a whole number" })
    .int("Enter a whole number")
    .min(0, "Can't be negative")
    .max(100_000, "That's too many"),
  reason: z.enum(Object.keys(MANUAL_REASONS), { error: "Choose a reason" }),
  note: z.string().trim().max(255).default(""),
});

/**
 * Change one variant's stock (add / remove / set exact) and record an
 * inventory movement with the resulting level. Atomic: concurrent edits or
 * orders can't push stock below zero.
 */
export async function adjustStock(_prev, formData) {
  const admin = await requireAdmin();
  const parsed = adjustSchema.safeParse({
    variantId: formData.get("variantId"),
    mode: formData.get("mode"),
    quantity: formData.get("quantity") || "",
    reason: formData.get("reason"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    const errors = {};
    for (const i of parsed.error.issues) errors[i.path[0]] ??= i.message;
    return { ok: false, errors };
  }
  const { variantId, mode, quantity, reason, note } = parsed.data;
  if (mode !== "set" && quantity === 0) return { ok: false, errors: { quantity: "Enter a quantity above 0" } };

  let result;
  try {
    result = await db.$transaction(async (tx) => {
      const v = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: { stock: true, sku: true, product: { select: { slug: true, deletedAt: true } } },
      });
      if (!v || v.product.deletedAt) throw new Error("NOT_FOUND");

      let change;
      if (mode === "add") {
        change = quantity;
        await tx.productVariant.update({ where: { id: variantId }, data: { stock: { increment: quantity } } });
      } else if (mode === "remove") {
        change = -quantity;
        // Conditional decrement: fails instead of going negative if stock changed meanwhile.
        const res = await tx.productVariant.updateMany({
          where: { id: variantId, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (res.count === 0) throw new Error(`INSUFFICIENT:${v.stock}`);
      } else {
        // Set exact: lock the row's current value via a conditional update.
        change = quantity - v.stock;
        const res = await tx.productVariant.updateMany({
          where: { id: variantId, stock: v.stock },
          data: { stock: quantity },
        });
        if (res.count === 0) throw new Error("CHANGED");
      }
      if (change === 0) return { change: 0, stockAfter: v.stock, sku: v.sku, slug: v.product.slug };

      const after = await tx.productVariant.findUnique({ where: { id: variantId }, select: { stock: true } });
      await tx.inventoryMovement.create({
        data: { variantId, change, stockAfter: after.stock, reason, note: note || null, actorId: admin.id },
      });
      return { change, stockAfter: after.stock, sku: v.sku, slug: v.product.slug };
    });
  } catch (e) {
    const msg = String(e?.message ?? "");
    if (msg === "NOT_FOUND") return { ok: false, message: "This size no longer exists." };
    if (msg.startsWith("INSUFFICIENT:")) {
      return { ok: false, errors: { quantity: `Only ${msg.split(":")[1]} in stock — can't remove more than that.` } };
    }
    if (msg === "CHANGED") return { ok: false, message: "Stock changed while you were editing. Please try again." };
    throw e;
  }

  if (result.change === 0) return { ok: true, message: `No change: ${result.sku} already has ${result.stockAfter}.` };

  await audit({
    actorId: admin.id,
    action: "inventory.adjust",
    entity: "ProductVariant",
    entityId: variantId,
    metadata: { sku: result.sku, change: result.change, stockAfter: result.stockAfter, reason },
  });
  updateTag(CATALOG_TAG);
  updateTag(`product:${result.slug}`);
  refresh();
  const verb = result.change > 0 ? `Added ${result.change}` : `Removed ${-result.change}`;
  return { ok: true, message: `${verb} for ${result.sku}. New stock: ${result.stockAfter}.` };
}
