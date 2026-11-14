import "server-only";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { toPlain } from "@/lib/serialize";

/**
 * Admin product reads. Uncached on purpose (admins must see live data) and
 * every function re-checks the admin role — pages already do, but these can
 * be imported from anywhere.
 */
export const ADMIN_PAGE_SIZE = 20;
export const STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"];
export const GENDERS = ["WOMEN", "MEN", "UNISEX", "KIDS"];

export function parseProductListParams(sp = {}) {
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const q = (one(sp.q) ?? "").toString().trim().slice(0, 100);
  const status = STATUSES.includes(one(sp.status)) ? one(sp.status) : null;
  const category = /^[a-z0-9-]{1,140}$/.test(one(sp.category) ?? "") ? one(sp.category) : null;
  const stock = ["low", "out"].includes(one(sp.stock)) ? one(sp.stock) : null;
  const page = Math.max(1, Math.min(Number.parseInt(one(sp.page), 10) || 1, 1000));
  return { q, status, category, stock, page };
}

export async function listAdminProducts({ q, status, category, stock, page }) {
  await requireStaff();
  const settings = await db.storeSettings.findUnique({ where: { id: 1 }, select: { lowStockThreshold: true } });
  const low = settings?.lowStockThreshold ?? 5;

  const where = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(category ? { categories: { some: { slug: category } } } : {}),
    ...(q
      ? {
          OR: [{ name: { contains: q } }, { slug: { contains: q } }, { variants: { some: { sku: { contains: q } } } }],
        }
      : {}),
    ...(stock === "out" ? { variants: { none: { isActive: true, stock: { gt: 0 } } } } : {}),
    ...(stock === "low" ? { variants: { some: { isActive: true, stock: { gt: 0, lte: low } } } } : {}),
  };

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        gender: true,
        basePrice: true,
        compareAtPrice: true,
        isFeatured: true,
        updatedAt: true,
        images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        categories: { select: { name: true }, take: 2 },
        variants: { where: { isActive: true }, select: { stock: true } },
      },
    }),
  ]);

  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
    lowStockThreshold: low,
    products: rows.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      gender: p.gender,
      price: Number(p.basePrice),
      compareAt: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      featured: p.isFeatured,
      updatedAt: p.updatedAt.toISOString(),
      image: p.images[0]?.url ?? null,
      categories: p.categories.map((c) => c.name),
      variantCount: p.variants.length,
      stock: p.variants.reduce((sum, v) => sum + v.stock, 0),
      soldOutVariants: p.variants.filter((v) => v.stock <= 0).length,
    })),
  };
}

export async function getProductFormOptions() {
  await requireStaff();
  const [categories, brands, sizeCharts] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.sizeChart.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, entries: { orderBy: { sortOrder: "asc" }, select: { label: true } } },
    }),
  ]);
  return {
    categories,
    brands,
    sizeCharts: sizeCharts.map((c) => ({ id: c.id, name: c.name, sizes: c.entries.map((e) => e.label) })),
  };
}

/** Full product for the editor, in the exact shape the form expects. */
export async function getAdminProduct(id) {
  await requireStaff();
  if (typeof id !== "string" || id.length > 40) return null;
  const p = await db.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      categories: { select: { id: true } },
      images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, alt: true, color: true } },
      variants: {
        orderBy: [{ color: "asc" }, { size: "asc" }],
        select: {
          id: true,
          sku: true,
          color: true,
          colorHex: true,
          size: true,
          price: true,
          stock: true,
          isActive: true,
          _count: { select: { orderItems: true } },
        },
      },
      _count: { select: { orderItems: true } },
    },
  });
  if (!p) return null;
  const plain = toPlain(p);
  return {
    id: plain.id,
    name: plain.name,
    slug: plain.slug,
    status: plain.status,
    gender: plain.gender,
    shortDescription: plain.shortDescription ?? "",
    description: plain.description ?? "",
    material: plain.material ?? "",
    basePrice: plain.basePrice,
    compareAtPrice: plain.compareAtPrice ?? "",
    costPrice: plain.costPrice ?? "",
    isFeatured: plain.isFeatured,
    isTaxable: plain.isTaxable,
    brandId: plain.brandId ?? "",
    sizeChartId: plain.sizeChartId ?? "",
    categoryIds: plain.categories.map((c) => c.id),
    metaTitle: plain.metaTitle ?? "",
    metaDescription: plain.metaDescription ?? "",
    images: plain.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, color: i.color ?? "" })),
    variants: plain.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      color: v.color,
      colorHex: v.colorHex ?? "",
      size: v.size,
      price: v.price ?? "",
      stock: v.stock,
      isActive: v.isActive,
      ordered: v._count.orderItems > 0,
    })),
    hasOrders: plain._count.orderItems > 0,
    updatedAt: plain.updatedAt,
  };
}

/**
 * First free product slug for `base`: "zari-khussa", then "zari-khussa-2", "-3"…
 * `excludeId` lets a product keep its own slug.
 */
export async function uniqueProductSlug(base, excludeId) {
  await requireStaff();
  const root = (base || "product").slice(0, 200).replace(/-+$/, "");
  const rows = await db.product.findMany({
    where: { slug: { startsWith: root }, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { slug: true },
  });
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(root)) return root;
  for (let n = 2; n < 10_000; n += 1) if (!taken.has(`${root}-${n}`)) return `${root}-${n}`;
  return `${root}-${Date.now().toString(36)}`;
}
