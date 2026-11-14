import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { getStoreSettings } from "@/lib/settings";

/** Products, categories and brands for the vouchers/offers "Applies to" picker. */
export async function getScopeOptions() {
  await requireStaff();
  const [products, categories, brands] = await Promise.all([
    db.product.findMany({
      where: { deletedAt: null, status: { not: "ARCHIVED" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true, brandId: true, categories: { select: { id: true } } },
    }),
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      brandId: p.brandId,
      categoryIds: p.categories.map((c) => c.id),
    })),
    categories,
    brands,
  };
}

const idList = z.array(z.string().min(10).max(40)).max(500);

/** Parse the picker's hidden inputs. Returns { appliesToAll, productIds, categoryIds, brandIds } or null. */
export function readScope(formData) {
  const json = (k) => {
    try {
      return JSON.parse(String(formData.get(k) ?? "[]"));
    } catch {
      return null;
    }
  };
  const parsed = z
    .object({ appliesToAll: z.boolean(), productIds: idList, categoryIds: idList, brandIds: idList })
    .safeParse({
      appliesToAll: formData.get("appliesToAll") === "1",
      productIds: json("productIds"),
      categoryIds: json("categoryIds"),
      brandIds: json("brandIds"),
    });
  return parsed.success ? parsed.data : null;
}

/** Drop ids that no longer exist; returns the cleaned scope. */
export async function validScope(scope) {
  if (scope.appliesToAll) return { ...scope, productIds: [], categoryIds: [], brandIds: [] };
  const [p, c, b] = await Promise.all([
    db.product.findMany({ where: { id: { in: scope.productIds }, deletedAt: null }, select: { id: true } }),
    db.category.findMany({ where: { id: { in: scope.categoryIds } }, select: { id: true } }),
    db.brand.findMany({ where: { id: { in: scope.brandIds } }, select: { id: true } }),
  ]);
  return {
    appliesToAll: false,
    productIds: p.map((x) => x.id),
    categoryIds: c.map((x) => x.id),
    brandIds: b.map((x) => x.id),
  };
}

/** Prisma relation data for a scope (`connect` when creating, `set` when updating). */
export function scopeRelations(scope, { create = false } = {}) {
  const set = (ids) => ({ [create ? "connect" : "set"]: ids.map((id) => ({ id })) });
  return {
    appliesToAll: scope.appliesToAll,
    products: set(scope.productIds),
    categories: set(scope.categoryIds),
    brands: set(scope.brandIds),
  };
}

/** Short human summary, e.g. "2 categories, 5 products". */
export function scopeSummary(c) {
  if (c.appliesToAll) return "Every product";
  const n = (count, one, many) => (count ? `${count} ${count === 1 ? one : many}` : null);
  return (
    [
      n(c._count?.categories ?? c.categories?.length, "category", "categories"),
      n(c._count?.brands ?? c.brands?.length, "brand", "brands"),
      n(c._count?.products ?? c.products?.length, "product", "products"),
    ]
      .filter(Boolean)
      .join(", ") || "Nothing selected"
  );
}

/**
 * For social posts: a short "what's covered" phrase, category slugs (for
 * hashtags) and photos of covered, live products.
 * `scope` = { appliesToAll, productIds, categoryIds, brandIds }.
 */
export async function scopeSocialData(scope, photoLimit = 8) {
  await requireStaff();
  const [cats, brands, named] = await Promise.all([
    scope.categoryIds.length
      ? db.category.findMany({ where: { id: { in: scope.categoryIds } }, select: { name: true, slug: true } })
      : [],
    scope.brandIds.length ? db.brand.findMany({ where: { id: { in: scope.brandIds } }, select: { name: true } }) : [],
    scope.productIds.length
      ? db.product.findMany({ where: { id: { in: scope.productIds } }, select: { name: true }, take: 3 })
      : [],
  ]);
  const covered = scope.appliesToAll
    ? {}
    : {
        OR: [
          ...(scope.productIds.length ? [{ id: { in: scope.productIds } }] : []),
          ...(scope.categoryIds.length ? [{ categories: { some: { id: { in: scope.categoryIds } } } }] : []),
          ...(scope.brandIds.length ? [{ brandId: { in: scope.brandIds } }] : []),
        ],
      };
  const products = await db.product.findMany({
    where: { status: "ACTIVE", deletedAt: null, images: { some: {} }, ...covered },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: photoLimit,
    select: { name: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } },
  });

  let scopeText = "Everything";
  if (!scope.appliesToAll) {
    const parts = [...cats.map((c) => c.name), ...brands.map((b) => b.name)];
    if (scope.productIds.length) {
      parts.push(
        scope.productIds.length <= 2 && named.length === scope.productIds.length
          ? named.map((p) => p.name).join(" & ")
          : "selected styles",
      );
    }
    scopeText = parts.length > 2 ? `${parts.slice(0, 2).join(", ")} and more` : parts.join(" & ") || "selected styles";
  }
  return {
    scopeText,
    categorySlugs: cats.map((c) => c.slug),
    photos: products.map((p) => ({ url: p.images[0].url, name: p.name })),
  };
}

/** Everything the voucher / offer social post dialog needs from the server. */
export async function promoSocialProps(scope) {
  const [data, settings] = await Promise.all([scopeSocialData(scope), getStoreSettings()]);
  return {
    ...data,
    siteUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, ""),
    settings: {
      codEnabled: settings.codEnabled,
      freeDeliveryEnabled: settings.freeDeliveryEnabled,
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
      returnsEnabled: settings.returnsEnabled,
      returnWindowDays: settings.returnWindowDays,
    },
  };
}
