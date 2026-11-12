"use server";

import { listProducts, parseFilters } from "@/lib/catalog";

/**
 * Next batch for the shop's infinite scroll. `query` is the page's raw
 * searchParams — re-parsed and validated here, never trusted as-is.
 * Results come from the cached catalogue query, so this stays cheap.
 */
export async function loadMoreProducts(query, page) {
  const n = Number.parseInt(page, 10);
  if (!Number.isInteger(n) || n < 2 || n > 500) return { products: [], total: 0 };
  const safeQuery = query && typeof query === "object" ? query : {};
  const { products, total } = await listProducts(parseFilters({ ...safeQuery, page: String(n) }), "page");
  return { products, total };
}
