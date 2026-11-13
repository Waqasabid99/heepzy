import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { toPlain } from "@/lib/serialize";

/**
 * Public catalogue queries. All cached on the server and tagged so admin
 * edits can invalidate them with `updateTag(CATALOG_TAG)` / `product:<slug>`.
 */
export const CATALOG_TAG = "catalog";
export const PAGE_SIZE = 12;

/** Sort options shown in the shop's Sort menu, in display order. */
export const SORTS = {
  featured: { label: "Featured", orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }] },
  newest: { label: "Date, new to old", orderBy: [{ createdAt: "desc" }] },
  oldest: { label: "Date, old to new", orderBy: [{ createdAt: "asc" }] },
  "price-asc": { label: "Price, low to high", orderBy: [{ basePrice: "asc" }] },
  "price-desc": { label: "Price, high to low", orderBy: [{ basePrice: "desc" }] },
  "name-asc": { label: "Alphabetically, A–Z", orderBy: [{ name: "asc" }] },
  "name-desc": { label: "Alphabetically, Z–A", orderBy: [{ name: "desc" }] },
};

const GENDER_PARAM = { men: "MEN", women: "WOMEN", kids: "KIDS", unisex: "UNISEX" };
const GENDER_LABEL = { MEN: "Men", WOMEN: "Women", KIDS: "Kids", UNISEX: "Unisex" };

const cardSelect = {
  id: true,
  slug: true,
  name: true,
  gender: true,
  basePrice: true,
  compareAtPrice: true,
  isFeatured: true,
  createdAt: true,
  images: { orderBy: { sortOrder: "asc" }, take: 6, select: { url: true, alt: true, color: true } },
  categories: { select: { name: true, slug: true }, take: 1 },
  variants: { where: { isActive: true }, select: { colorHex: true, color: true, stock: true } },
};

/** Shape a product row into the minimal, client-safe card model. */
function toCard(p) {
  const price = Number(p.basePrice);
  const compareAt = p.compareAtPrice ? Number(p.compareAtPrice) : null;
  const onSale = compareAt && compareAt > price;
  const colours = [...new Map(p.variants.map((v) => [v.color, v.colorHex])).entries()];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: [GENDER_LABEL[p.gender], p.categories[0]?.name].filter(Boolean).join(" · "),
    category: p.categories[0]?.slug ?? null,
    price,
    compareAt: onSale ? compareAt : null,
    badge: onSale ? `−${Math.round(((compareAt - price) / compareAt) * 100)}%` : p.isFeatured ? "New" : null,
    image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt } : null,
    images: p.images.map((i) => ({ url: i.url, alt: i.alt, color: i.color })),
    colours: colours.map(([name, hex]) => ({ name, hex })),
    soldOut: p.variants.every((v) => v.stock <= 0),
    gender: p.gender,
  };
}

export async function getHomeCatalog() {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const [featured, categories] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 30,
      select: cardSelect,
    }),
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: {
        name: true,
        slug: true,
        imageUrl: true,
        _count: { select: { products: { where: { status: "ACTIVE", deletedAt: null } } } },
      },
    }),
  ]);

  const products = featured.map(toCard);
  const maxDiscount = Math.max(
    0,
    ...products.filter((p) => p.compareAt).map((p) => Math.round(((p.compareAt - p.price) / p.compareAt) * 100)),
  );
  return {
    products,
    maxDiscount,
    categories: categories.map((c) => ({ name: c.name, slug: c.slug, imageUrl: c.imageUrl, count: c._count.products })),
  };
}

/** Recent approved 4–5 star reviews with text, for the home page (first name only). */
export async function getHomeReviews(limit = 4) {
  "use cache";
  cacheTag(CATALOG_TAG, "reviews");
  cacheLife("hours");

  const rows = await db.review.findMany({
    where: { status: "APPROVED", rating: { gte: 4 }, body: { not: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      rating: true,
      body: true,
      user: { select: { name: true } },
      product: { select: { name: true, slug: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    body: r.body.length > 180 ? `${r.body.slice(0, 177)}…` : r.body,
    author: r.user.name?.split(" ")[0] || "Verified customer",
    product: r.product,
  }));
}

/** Normalise untrusted searchParams into a small, safe filter object. */
export function parseFilters(sp = {}) {
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const many = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const int = (v) => {
    const n = Number.parseInt(one(v), 10);
    return Number.isFinite(n) && n >= 0 ? Math.min(n, 10_000_000) : null;
  };
  const sort = Object.hasOwn(SORTS, one(sp.sort)) ? one(sp.sort) : "featured";
  const clean = (arr, re) => arr.filter((s) => typeof s === "string" && re.test(s)).slice(0, 20);

  return {
    gender: GENDER_PARAM[one(sp.gender)] ? one(sp.gender) : null,
    category: clean(many(sp.category), /^[a-z0-9-]{1,140}$/),
    size: clean(many(sp.size), /^[0-9.]{1,4}$/),
    sale: one(sp.sale) === "1",
    min: int(sp.min),
    max: int(sp.max),
    q: typeof one(sp.q) === "string" ? one(sp.q).trim().slice(0, 80) : "",
    sort,
    page: Math.max(1, Math.min(int(sp.page) ?? 1, 500)),
  };
}

/** Max pages a single "through" request may return (shareable ?page=N links). */
export const MAX_THROUGH_PAGES = 10;

/**
 * mode "page": just that page (infinite scroll's next batch).
 * mode "through": pages 1…N in one go (initial render of /products?page=N,
 * so refresh/back restores the scrolled list; also the no-JS fallback).
 */
export async function listProducts(filters, mode = "page") {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const { gender, category, size, sale, min, max, q, sort, page } = filters;
  const where = {
    status: "ACTIVE",
    deletedAt: null,
    ...(gender
      ? {
          gender: {
            in: gender === "men" || gender === "women" ? [GENDER_PARAM[gender], "UNISEX"] : [GENDER_PARAM[gender]],
          },
        }
      : {}),
    ...(category.length ? { categories: { some: { slug: { in: category } } } } : {}),
    ...(size.length ? { variants: { some: { size: { in: size }, stock: { gt: 0 }, isActive: true } } } : {}),
    ...(sale ? { compareAtPrice: { not: null } } : {}),
    ...(min != null || max != null
      ? { basePrice: { ...(min != null ? { gte: min } : {}), ...(max != null ? { lte: max } : {}) } }
      : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { shortDescription: { contains: q } }] } : {}),
  };
  // `id` tiebreaker keeps ordering stable so pages never repeat or skip items.
  const orderBy = [...SORTS[sort].orderBy, { id: "asc" }];
  const through = mode === "through";
  const last = through ? Math.min(page, MAX_THROUGH_PAGES) : page;

  const [total, rows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where,
      orderBy,
      skip: through ? 0 : (page - 1) * PAGE_SIZE,
      take: through ? last * PAGE_SIZE : PAGE_SIZE,
      select: cardSelect,
    }),
  ]);
  return { total, page: last, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), products: rows.map(toCard) };
}

export async function getFacets() {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const [categories, sizes, price] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { name: true, slug: true },
    }),
    db.productVariant.findMany({ where: { isActive: true }, distinct: ["size"], select: { size: true } }),
    db.product.aggregate({ where: { status: "ACTIVE", deletedAt: null }, _max: { basePrice: true } }),
  ]);
  return {
    categories,
    sizes: sizes.map((s) => s.size).sort((a, b) => Number(a) - Number(b)),
    // Slider ceiling: the most expensive product, rounded up to the next Rs 1,000.
    priceMax: Math.ceil(Number(price._max.basePrice ?? 0) / 1000) * 1000 || 20000,
  };
}

export async function getProduct(slug) {
  "use cache";
  cacheTag(CATALOG_TAG, `product:${slug}`);
  cacheLife("hours");

  const p = await db.product.findFirst({
    where: { slug, status: "ACTIVE", deletedAt: null },
    include: {
      brand: { select: { name: true } },
      categories: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { size: "asc" } },
      sizeChart: { include: { entries: { orderBy: { sortOrder: "asc" } } } },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          fit: true,
          isVerifiedPurchase: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
    },
  });
  if (!p) return null;

  const plain = toPlain(p);
  return {
    id: plain.id,
    slug: plain.slug,
    name: plain.name,
    gender: GENDER_LABEL[plain.gender],
    category: plain.categories[0] ?? null,
    brand: plain.brand?.name ?? null,
    shortDescription: plain.shortDescription,
    description: plain.description,
    material: plain.material,
    price: Number(plain.basePrice),
    compareAt:
      plain.compareAtPrice && Number(plain.compareAtPrice) > Number(plain.basePrice)
        ? Number(plain.compareAtPrice)
        : null,
    rating: { average: Number(plain.ratingAverage), count: plain.ratingCount },
    images: plain.images.map((i) => ({ url: i.url, alt: i.alt, color: i.color })),
    variants: plain.variants
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        color: v.color,
        colorHex: v.colorHex,
        size: v.size,
        stock: v.stock,
        price: v.price ? Number(v.price) : null,
      }))
      .sort((a, b) => Number(a.size) - Number(b.size)),
    sizeChart: plain.sizeChart
      ? {
          name: plain.sizeChart.name,
          description: plain.sizeChart.description,
          entries: plain.sizeChart.entries.map(({ label, eu, uk, us, footLengthCm }) => ({
            label,
            eu,
            uk,
            us,
            cm: footLengthCm == null ? null : Number(footLengthCm).toFixed(1),
          })),
        }
      : null,
    reviews: plain.reviews.map((r) => ({ ...r, user: r.user?.name?.split(" ")[0] ?? "Customer" })),
    metaTitle: plain.metaTitle,
  };
}

export async function getRelatedProducts(slug, categorySlug) {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const rows = await db.product.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      slug: { not: slug },
      ...(categorySlug ? { categories: { some: { slug: categorySlug } } } : {}),
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: 4,
    select: cardSelect,
  });
  return rows.map(toCard);
}

export async function getSizeCharts() {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("days");

  const charts = await db.sizeChart.findMany({
    include: { entries: { orderBy: { sortOrder: "asc" } } },
    orderBy: { name: "asc" },
  });
  return toPlain(charts).map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    entries: c.entries.map(({ eu, uk, us, footLengthCm }) => ({
      eu,
      uk,
      us,
      cm: footLengthCm == null ? null : Number(footLengthCm).toFixed(1),
    })),
  }));
}
