import "server-only";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { loadPromotions, priceFor } from "@/lib/pricing";

/** Data for creating orders from the admin panel. Every function re-checks the admin role. */

const addressSelect = {
  id: true,
  label: true,
  fullName: true,
  phone: true,
  line1: true,
  line2: true,
  city: true,
  province: true,
  postalCode: true,
  isDefault: true,
};
const customerSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  banned: true,
  addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], select: addressSelect },
};

export async function searchCustomers(q) {
  await requireStaff();
  const term = String(q ?? "")
    .trim()
    .slice(0, 80);
  if (term.length < 2) return [];
  const rows = await db.user.findMany({
    where: {
      banned: { not: true },
      OR: [
        { name: { contains: term } },
        { email: { contains: term } },
        { phone: { contains: term.replace(/\s/g, "") } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: customerSelect,
  });
  return rows;
}

export async function getCustomerForOrder(id) {
  await requireStaff();
  if (typeof id !== "string" || !id || id.length > 64) return null;
  return db.user.findFirst({ where: { id, banned: { not: true } }, select: customerSelect });
}

/** Active products matching a name or SKU, with in-stock sizes priced like the store. */
export async function searchProducts(q) {
  await requireStaff();
  const term = String(q ?? "")
    .trim()
    .slice(0, 80);
  if (term.length < 2) return [];
  const [rows, promos] = await Promise.all([
    db.product.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        OR: [{ name: { contains: term } }, { variants: { some: { sku: { contains: term } } } }],
      },
      orderBy: { name: "asc" },
      take: 10,
      select: {
        id: true,
        name: true,
        brandId: true,
        basePrice: true,
        compareAtPrice: true,
        categories: { select: { id: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        variants: {
          where: { isActive: true },
          orderBy: [{ color: "asc" }, { size: "asc" }],
          select: { id: true, sku: true, color: true, size: true, stock: true, price: true, compareAtPrice: true },
        },
      },
    }),
    loadPromotions(),
  ]);
  return rows.map((p) => {
    const who = { id: p.id, brandId: p.brandId, categoryIds: p.categories.map((c) => c.id) };
    return {
      id: p.id,
      name: p.name,
      image: p.images[0]?.url ?? null,
      variants: p.variants.map((v) => {
        const priced = priceFor(
          promos.list,
          who,
          v.price ?? p.basePrice,
          v.price ? v.compareAtPrice : p.compareAtPrice,
        );
        return {
          id: v.id,
          sku: v.sku,
          color: v.color,
          size: v.size,
          stock: v.stock,
          price: priced.price,
          compareAt: priced.compareAt,
          offer: priced.promotion?.name ?? null,
        };
      }),
    };
  });
}

/**
 * Turn [{ variantId, quantity }] into checkout-style lines at live prices.
 * Returns { lines, problems } — problems lists items that are missing or short on stock.
 */
export async function buildLines(items) {
  await requireStaff();
  const ids = [...new Set(items.map((i) => i.variantId))];
  const [variants, promos] = await Promise.all([
    db.productVariant.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        sku: true,
        size: true,
        color: true,
        stock: true,
        price: true,
        compareAtPrice: true,
        isActive: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            deletedAt: true,
            brandId: true,
            basePrice: true,
            compareAtPrice: true,
            categories: { select: { id: true } },
            images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, alt: true } },
          },
        },
      },
    }),
    loadPromotions(),
  ]);
  const byId = new Map(variants.map((v) => [v.id, v]));
  const lines = [];
  const problems = [];
  for (const item of items) {
    const v = byId.get(item.variantId);
    if (!v || !v.isActive || v.product.status !== "ACTIVE" || v.product.deletedAt) {
      problems.push("An item is no longer available. Remove it and add it again.");
      continue;
    }
    const label = `${v.product.name} (${v.color}, ${v.size})`;
    if (v.stock < item.quantity) {
      problems.push(v.stock ? `Only ${v.stock} left of ${label}` : `${label} is out of stock`);
    }
    const categoryIds = v.product.categories.map((c) => c.id);
    const priced = priceFor(
      promos.list,
      { id: v.product.id, brandId: v.product.brandId, categoryIds },
      v.price ?? v.product.basePrice,
      v.price ? v.compareAtPrice : v.product.compareAtPrice,
    );
    lines.push({
      variantId: v.id,
      productId: v.product.id,
      brandId: v.product.brandId,
      categoryIds,
      sku: v.sku,
      stock: v.stock,
      slug: v.product.slug,
      name: v.product.name,
      size: v.size,
      color: v.color,
      image: v.product.images[0] ?? null,
      unitPrice: priced.price,
      compareAt: priced.compareAt,
      quantity: item.quantity,
      lineTotal: priced.price * item.quantity,
    });
  }
  return { lines, problems };
}
