import "server-only";
import { db } from "@/lib/db";

/**
 * Offers (automatic promotions) applied to catalogue, cart and checkout
 * prices. One offer per product: the highest priority wins, then the bigger
 * saving. Offers never stack with each other; vouchers apply on top at
 * checkout.
 *
 * Catalogue reads cache their results with a lifetime cut to the next offer
 * start/end (see offerAwareLife), so offers switch on and off on schedule
 * without anyone saving anything. Cart and checkout read offers uncached.
 */

const PROMO_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  type: true,
  value: true,
  priority: true,
  appliesToAll: true,
  startsAt: true,
  endsAt: true,
  products: { select: { id: true } },
  categories: { select: { id: true } },
  brands: { select: { id: true } },
};

/**
 * Live offers right now, plus `changesIn`: seconds until the next offer
 * starts or ends (null when nothing is scheduled). Uncached: use it where
 * the price must be exact (cart, checkout).
 */
export async function loadPromotions() {
  const now = new Date();
  const rows = await db.promotion.findMany({
    where: {
      isActive: true,
      type: { in: ["PERCENTAGE", "FIXED_AMOUNT"] },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    select: PROMO_SELECT,
  });
  const changes = rows
    .flatMap((r) => [r.startsAt, r.endsAt])
    .filter((d) => d && d > now)
    .map((d) => Math.ceil((d - now) / 1000));
  return {
    changesIn: changes.length ? Math.min(...changes) : null,
    list: rows
      .filter((r) => !r.startsAt || r.startsAt <= now)
      .map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        type: r.type,
        value: Number(r.value),
        priority: r.priority,
        appliesToAll: r.appliesToAll,
        productIds: r.products.map((p) => p.id),
        categoryIds: r.categories.map((c) => c.id),
        brandIds: r.brands.map((b) => b.id),
        endsAt: r.endsAt ? r.endsAt.toISOString() : null,
      })),
  };
}

/**
 * Cache lifetime for a cached catalogue read that priced products with these
 * offers: the normal lifetime, cut short so the entry expires when the next
 * offer starts or ends. Call as `cacheLife(offerAwareLife(promos, 3600))`.
 */
export function offerAwareLife({ changesIn }, maxSeconds) {
  const s = Math.max(30, Math.min(maxSeconds, changesIn ?? maxSeconds));
  // `revalidate` tracks the next offer change. `stale` (browser cache) and `expire` stay at 5 min or
  // more so pages remain prerenderable; cart and checkout always price with live offers anyway.
  return { stale: 300, revalidate: s, expire: Math.max(300, s + 60) };
}

/** Does this offer cover the product? `product` = { id, brandId, categoryIds }. */
export function promotionCovers(promo, product) {
  return (
    promo.appliesToAll ||
    promo.productIds.includes(product.id) ||
    (product.brandId != null && promo.brandIds.includes(product.brandId)) ||
    (product.categoryIds ?? []).some((id) => promo.categoryIds.includes(id))
  );
}

/** Price after an offer, rounded to whole rupees, never below Rs 1. */
export function discounted(price, promo) {
  const p = Number(price);
  const off = promo.type === "PERCENTAGE" ? (p * promo.value) / 100 : promo.value;
  return Math.max(1, Math.round(p - off));
}

/** The offer that applies to this product at this price, or null. */
export function bestPromotion(promos, product, price) {
  let best = null;
  for (const promo of promos) {
    if (!promotionCovers(promo, product)) continue;
    if (best && promo.priority < best.priority) break; // sorted by priority desc
    if (!best || discounted(price, promo) < discounted(price, best)) best = promo;
  }
  return best;
}

/**
 * Final selling price for a product (or one of its variants).
 * `price` is the base/variant price, `compareAt` the admin's "was" price.
 * Returns { price, compareAt (or null), promotion (or null) }.
 */
export function priceFor(promos, product, price, compareAt) {
  const base = Number(price);
  const promo = bestPromotion(promos, product, base);
  const now = promo ? discounted(base, promo) : base;
  const was = Math.max(Number(compareAt ?? 0), promo ? base : 0);
  return {
    price: now,
    compareAt: was > now ? was : null,
    promotion: promo ? { id: promo.id, name: promo.name, slug: promo.slug, endsAt: promo.endsAt } : null,
  };
}

/** Prisma `where` fragment matching every product covered by any of these offers (null when none). */
export function promotionWhere(promos) {
  if (!promos.length) return null;
  if (promos.some((p) => p.appliesToAll)) return {};
  const ids = (k) => [...new Set(promos.flatMap((p) => p[k]))];
  const productIds = ids("productIds");
  const categoryIds = ids("categoryIds");
  const brandIds = ids("brandIds");
  return {
    OR: [
      ...(productIds.length ? [{ id: { in: productIds } }] : []),
      ...(categoryIds.length ? [{ categories: { some: { id: { in: categoryIds } } } }] : []),
      ...(brandIds.length ? [{ brandId: { in: brandIds } }] : []),
    ],
  };
}
