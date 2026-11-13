"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { audit } from "@/lib/audit";
import { listUploads, saveImage } from "@/lib/uploads";
import { CATALOG_TAG } from "@/lib/catalog";
import { GENDERS, STATUSES, uniqueProductSlug } from "@/lib/admin/products";
import { slugify } from "@/lib/slug";

const money = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 4990 or 4990.50");
const optionalMoney = z.union([z.literal(""), money]).transform((v) => (v === "" ? null : v));
const cuid = z.string().min(10).max(40);

const imageSchema = z.object({
  url: z
    .string()
    .max(512)
    .regex(/^\/(media|images)\/[A-Za-z0-9/_.-]+$/, "Invalid image"),
  alt: z.string().trim().min(1, "Every image needs a description (alt text)").max(200),
  color: z.string().trim().max(60).default(""),
});

const variantSchema = z.object({
  id: cuid.optional(),
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required")
    .max(64)
    .regex(/^[A-Za-z0-9._-]+$/, "SKU: letters, numbers, dot, dash or underscore only"),
  color: z.string().trim().min(1, "Colour is required").max(60),
  colorHex: z.union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/)]).default(""),
  size: z.string().trim().min(1).max(20),
  price: optionalMoney.default(""),
  stock: z.coerce.number().int().min(0).max(100_000),
  isActive: z.boolean().default(true),
});

const productSchema = z
  .object({
    id: z.union([z.literal(""), cuid]).default(""),
    name: z.string().trim().min(2, "Name is required").max(200),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(220)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$|^$/, "Use lowercase letters, numbers and dashes"),
    // "auto": built from the name and made unique on save. "custom": exactly what the admin typed.
    slugMode: z.enum(["auto", "custom"]).default("auto"),
    status: z.enum(STATUSES),
    gender: z.enum(GENDERS),
    shortDescription: z.string().trim().max(500).default(""),
    description: z.string().trim().max(20_000).default(""),
    material: z.string().trim().max(120).default(""),
    basePrice: z.string().trim().min(1, "Enter a price").pipe(money),
    compareAtPrice: optionalMoney,
    costPrice: optionalMoney,
    isFeatured: z.boolean(),
    isTaxable: z.boolean(),
    brandId: z.union([z.literal(""), cuid]),
    sizeChartId: z.union([z.literal(""), cuid]),
    categoryIds: z.array(cuid).max(10),
    metaTitle: z.string().trim().max(200).default(""),
    metaDescription: z.string().trim().max(320).default(""),
    images: z.array(imageSchema).max(12, "Up to 12 images per product"),
    variants: z.array(variantSchema).max(400),
  })
  .superRefine((p, ctx) => {
    if (p.compareAtPrice && Number(p.compareAtPrice) <= Number(p.basePrice)) {
      ctx.addIssue({ code: "custom", path: ["compareAtPrice"], message: "Must be higher than the price" });
    }
    const combos = new Set();
    const skus = new Set();
    p.variants.forEach((v, i) => {
      const key = `${v.color.toLowerCase()}|${v.size}`;
      if (combos.has(key))
        ctx.addIssue({ code: "custom", path: ["variants", i], message: `${v.color} / ${v.size} is listed twice` });
      combos.add(key);
      const sku = v.sku.toUpperCase();
      if (skus.has(sku)) ctx.addIssue({ code: "custom", path: ["variants", i], message: `SKU ${v.sku} is used twice` });
      skus.add(sku);
    });
    if (p.status === "ACTIVE") {
      if (!p.images.length)
        ctx.addIssue({ code: "custom", path: ["images"], message: "Add at least one image before publishing" });
      if (!p.variants.some((v) => v.isActive))
        ctx.addIssue({ code: "custom", path: ["variants"], message: "Add at least one active size before publishing" });
    }
  });

function readForm(formData) {
  const json = (key) => {
    try {
      return JSON.parse(String(formData.get(key) ?? "[]"));
    } catch {
      return null;
    }
  };
  const text = (key) => String(formData.get(key) ?? "");
  return {
    id: text("id"),
    name: text("name"),
    slug: text("slug"),
    slugMode: text("slugMode") || "auto",
    status: text("status"),
    gender: text("gender"),
    shortDescription: text("shortDescription"),
    description: text("description"),
    material: text("material"),
    basePrice: text("basePrice"),
    compareAtPrice: text("compareAtPrice"),
    costPrice: text("costPrice"),
    isFeatured: formData.get("isFeatured") === "on",
    isTaxable: formData.get("isTaxable") === "on",
    brandId: text("brandId"),
    sizeChartId: text("sizeChartId"),
    categoryIds: formData.getAll("categoryIds").map(String),
    metaTitle: text("metaTitle"),
    metaDescription: text("metaDescription"),
    images: json("images"),
    variants: json("variants"),
  };
}

/** First error per field. Row-level errors name the row (colour/size or photo number). */
function fieldErrors(error, raw) {
  const out = {};
  for (const issue of error.issues) {
    const [key = "form", index] = issue.path;
    let message = issue.message;
    if (typeof index === "number" && issue.path.length > 2) {
      if (key === "variants") {
        const v = raw?.variants?.[index];
        message = `${v?.color || "Colour"}, size ${v?.size || index + 1}: ${message}`;
      } else if (key === "images") {
        message = `Photo ${index + 1}: ${message}`;
      }
    }
    out[key] ??= message;
  }
  return out;
}

/** Expire storefront caches for these products and re-render the current admin page. */
function refreshCatalog(...slugs) {
  updateTag(CATALOG_TAG);
  for (const s of slugs) if (s) updateTag(`product:${s}`);
  refresh();
}

/** Create or update a product with its images and variants. useActionState-compatible. */
export async function saveProduct(_prev, formData) {
  const admin = await requireAdmin();
  const raw = readForm(formData);
  // Echo typed values back so the form keeps them when validation fails (React resets forms after actions).
  const { images: _i, variants: _v, ...values } = raw;
  // The form lists every field error itself; `message` is only for problems not tied to a field.
  const fail = (errors, message = null) => ({ ok: false, message, errors, values });
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return fail(fieldErrors(parsed.error, raw));
  const p = parsed.data;
  let slug;
  if (p.slugMode === "auto") {
    slug = await uniqueProductSlug(slugify(p.name), p.id || undefined);
  } else {
    slug = p.slug;
    if (!slug) return fail({ slug: "Enter a URL, or switch back to the automatic one" });
  }

  const existing = p.id
    ? await db.product.findFirst({
        where: { id: p.id, deletedAt: null },
        select: {
          id: true,
          slug: true,
          variants: { select: { id: true, stock: true, _count: { select: { orderItems: true } } } },
        },
      })
    : null;
  if (p.id && !existing) return fail({}, "This product no longer exists.");

  // Uniqueness checks against other products.
  const [slugTaken, skuTaken, validRefs] = await Promise.all([
    db.product.findFirst({ where: { slug, NOT: { id: p.id || undefined } }, select: { id: true } }),
    db.productVariant.findFirst({
      where: { sku: { in: p.variants.map((v) => v.sku) }, NOT: { productId: p.id || undefined } },
      select: { sku: true },
    }),
    Promise.all([
      p.brandId ? db.brand.count({ where: { id: p.brandId } }) : 1,
      p.sizeChartId ? db.sizeChart.count({ where: { id: p.sizeChartId } }) : 1,
      db.category.count({ where: { id: { in: p.categoryIds } } }),
    ]),
  ]);
  const errors = {};
  if (slugTaken) {
    errors.slug = `Another product already uses this URL. Try “${await uniqueProductSlug(slug, p.id || undefined)}”.`;
  }
  if (skuTaken) errors.variants = `SKU ${skuTaken.sku} is already used by another product`;
  if (!validRefs[0]) errors.brandId = "Unknown brand";
  if (!validRefs[1]) errors.sizeChartId = "Unknown size chart";
  if (validRefs[2] !== p.categoryIds.length) errors.categoryIds = "Unknown category";
  if (Object.keys(errors).length) return fail(errors);

  // Variant ids from the form must belong to this product.
  const own = new Map((existing?.variants ?? []).map((v) => [v.id, v]));
  for (const v of p.variants) if (v.id && !own.has(v.id)) delete v.id;

  const data = {
    name: p.name,
    slug,
    status: p.status,
    gender: p.gender,
    shortDescription: p.shortDescription || null,
    description: p.description || null,
    material: p.material || null,
    basePrice: p.basePrice,
    compareAtPrice: p.compareAtPrice,
    costPrice: p.costPrice,
    isFeatured: p.isFeatured,
    isTaxable: p.isTaxable,
    metaTitle: p.metaTitle || null,
    metaDescription: p.metaDescription || null,
    brand: p.brandId ? { connect: { id: p.brandId } } : existing ? { disconnect: true } : undefined,
    sizeChart: p.sizeChartId ? { connect: { id: p.sizeChartId } } : existing ? { disconnect: true } : undefined,
  };

  const productId = await db.$transaction(async (tx) => {
    const product = existing
      ? await tx.product.update({
          where: { id: existing.id },
          data: { ...data, categories: { set: p.categoryIds.map((id) => ({ id })) } },
          select: { id: true },
        })
      : await tx.product.create({
          data: { ...data, categories: { connect: p.categoryIds.map((id) => ({ id })) } },
          select: { id: true },
        });

    // Images: replace the set in the submitted order.
    await tx.productImage.deleteMany({ where: { productId: product.id } });
    if (p.images.length) {
      await tx.productImage.createMany({
        data: p.images.map((img, i) => ({
          productId: product.id,
          url: img.url,
          alt: img.alt,
          color: img.color || null,
          sortOrder: i,
        })),
      });
    }

    // Variants removed in the form: delete, or deactivate if they were ever ordered.
    const keep = new Set(p.variants.filter((v) => v.id).map((v) => v.id));
    for (const [id, v] of own) {
      if (keep.has(id)) continue;
      if (v._count.orderItems > 0) await tx.productVariant.update({ where: { id }, data: { isActive: false } });
      else await tx.productVariant.delete({ where: { id } });
    }

    // Free up SKUs/combos first so swaps between rows don't hit unique constraints.
    let tmp = 0;
    for (const v of p.variants.filter((v) => v.id)) {
      tmp += 1;
      await tx.productVariant.update({ where: { id: v.id }, data: { sku: `__tmp_${v.id}`, size: `~${tmp}` } });
    }

    const movements = [];
    for (const v of p.variants) {
      const fields = {
        sku: v.sku,
        color: v.color,
        colorHex: v.colorHex || null,
        size: v.size,
        price: v.price,
        stock: v.stock,
        isActive: v.isActive,
      };
      if (v.id) {
        await tx.productVariant.update({ where: { id: v.id }, data: fields });
        const change = v.stock - own.get(v.id).stock;
        if (change) movements.push({ variantId: v.id, change, reason: "ADJUSTMENT", note: "Edited in product form" });
      } else {
        const created = await tx.productVariant.create({
          data: { ...fields, productId: product.id },
          select: { id: true },
        });
        if (v.stock > 0)
          movements.push({ variantId: created.id, change: v.stock, reason: "RESTOCK", note: "Opening stock" });
      }
    }
    if (movements.length) {
      await tx.inventoryMovement.createMany({ data: movements.map((m) => ({ ...m, actorId: admin.id })) });
    }
    return product.id;
  });

  await audit({
    actorId: admin.id,
    action: existing ? "product.update" : "product.create",
    entity: "Product",
    entityId: productId,
    metadata: { name: p.name, status: p.status, variants: p.variants.length, images: p.images.length },
  });
  refreshCatalog(slug, existing?.slug !== slug ? existing?.slug : null);

  // Reload the editor with fresh ids/values and a confirmation banner.
  redirect(`/admin/products/${productId}?${existing ? "saved" : "created"}=${Date.now().toString(36)}`);
}

/** Live preview of the automatic URL for a product name (unique among other products). */
export async function previewProductSlug(name, id) {
  await requireAdmin();
  const base = slugify(String(name ?? "").slice(0, 200));
  if (!base) return { slug: "" };
  return { slug: await uniqueProductSlug(base, cuid.safeParse(id).success ? id : undefined) };
}

/**
 * Media gallery for the product editor: every image used by a product plus
 * uploads not attached to any product yet. Newest first.
 */
export async function listProductMedia() {
  await requireAdmin();
  const [rows, uploads] = await Promise.all([
    db.productImage.findMany({
      orderBy: { createdAt: "desc" },
      take: 2000,
      select: { url: true, alt: true, createdAt: true, product: { select: { name: true, deletedAt: true } } },
    }),
    listUploads("products"),
  ]);
  const byUrl = new Map();
  for (const r of rows) {
    const item = byUrl.get(r.url) ?? { url: r.url, alt: r.alt, createdAt: r.createdAt.toISOString(), products: [] };
    if (!r.product.deletedAt && !item.products.includes(r.product.name)) item.products.push(r.product.name);
    byUrl.set(r.url, item);
  }
  for (const u of uploads) {
    if (!byUrl.has(u.url)) byUrl.set(u.url, { url: u.url, alt: "", createdAt: u.createdAt, products: [] });
  }
  return [...byUrl.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Upload one product image; returns its URL for the form to add. */
export async function uploadProductImage(formData) {
  await requireAdmin();
  const result = await saveImage(formData.get("file"), { folder: "products" });
  if (result.error) return { ok: false, message: result.error };
  return { ok: true, url: result.url };
}

/** Publish / unpublish / archive from the list or editor. */
export async function setProductStatus(id, status) {
  const admin = await requireAdmin();
  if (!cuid.safeParse(id).success || !STATUSES.includes(status)) return { ok: false, message: "Invalid request." };
  const product = await db.product.findFirst({
    where: { id, deletedAt: null },
    select: { slug: true, _count: { select: { images: true, variants: { where: { isActive: true } } } } },
  });
  if (!product) return { ok: false, message: "Product not found." };
  if (status === "ACTIVE" && (!product._count.images || !product._count.variants)) {
    return { ok: false, message: "Add an image and at least one active size before publishing." };
  }
  await db.product.update({ where: { id }, data: { status } });
  await audit({ actorId: admin.id, action: "product.status", entity: "Product", entityId: id, metadata: { status } });
  refreshCatalog(product.slug);
  return {
    ok: true,
    message: status === "ACTIVE" ? "Published." : status === "DRAFT" ? "Moved to drafts." : "Archived.",
  };
}

/**
 * Delete a product. Products that were ever ordered are soft-deleted
 * (hidden everywhere, order history keeps its snapshot); others are removed.
 */
export async function deleteProduct(id) {
  const admin = await requireAdmin();
  if (!cuid.safeParse(id).success) return { ok: false, message: "Invalid request." };
  const product = await db.product.findFirst({
    where: { id, deletedAt: null },
    select: { slug: true, name: true, _count: { select: { orderItems: true } } },
  });
  if (!product) return { ok: false, message: "Product not found." };

  if (product._count.orderItems > 0) {
    await db.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: "ARCHIVED", slug: `${product.slug}-deleted-${Date.now().toString(36)}` },
    });
  } else {
    await db.product.delete({ where: { id } });
  }
  await audit({
    actorId: admin.id,
    action: "product.delete",
    entity: "Product",
    entityId: id,
    metadata: { name: product.name },
  });
  refreshCatalog(product.slug);
  redirect("/admin/products?deleted=1");
}
