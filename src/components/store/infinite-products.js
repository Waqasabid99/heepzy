"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { loadMoreProducts } from "@/actions/catalog";
import { ProductCard } from "./product-card";

const SIZES = "(min-width: 1280px) 23vw, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw";

/**
 * Infinite-scroll product grid.
 *  - Auto-loads the next page when the end of the grid comes within ~1 screen.
 *  - "Load more" button for manual / keyboard use; "No more products" at the end.
 *  - Keeps ?page=N in the URL so refresh/back restores the same list
 *    (the server renders pages 1…N). The button is a real link, so it also
 *    works without JavaScript.
 *
 * Re-mount (via `key`) whenever filters/sort change.
 */
export function InfiniteProducts({ initialProducts, total, initialPage, query, pageSize }) {
  const [items, setItems] = useState(initialProducts);
  const [page, setPage] = useState(initialPage);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const sentinel = useRef(null);
  const loading = useRef(false);

  const hasMore = items.length < total;

  const nextHref = (() => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) for (const x of [].concat(v)) qs.append(k, x);
    qs.set("page", String(page + 1));
    return `/products?${qs}`;
  })();

  const loadMore = useCallback(() => {
    if (loading.current || !hasMore) return;
    loading.current = true;
    setError(false);
    const next = page + 1;
    startTransition(async () => {
      try {
        const res = await loadMoreProducts(query, next);
        setItems((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...res.products.filter((p) => !seen.has(p.id))];
        });
        setPage(next);
        // Remember position for refresh/back without triggering navigation.
        const url = new URL(window.location.href);
        url.searchParams.set("page", String(next));
        window.history.replaceState(window.history.state, "", url);
      } catch {
        setError(true);
      } finally {
        loading.current = false;
      }
    });
  }, [hasMore, page, query]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || error) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), {
      rootMargin: "0px 0px 900px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, error, loadMore]);

  const pct = total ? Math.round((items.length / total) * 100) : 100;

  return (
    <>
      <div className="grid gap-x-4 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 4} sizes={SIZES} />
        ))}
        {pending
          ? Array.from({ length: Math.min(pageSize, total - items.length) }, (_, i) => (
              <div key={`sk-${i}`} aria-hidden="true" className="flex flex-col gap-3">
                <div className="aspect-square animate-pulse bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              </div>
            ))
          : null}
      </div>

      <div ref={sentinel} aria-hidden="true" />

      <div className="mt-16 flex flex-col items-center gap-4">
        <p className="text-[13px] text-fg-muted" role="status" aria-live="polite">
          Showing {items.length} of {total} {total === 1 ? "product" : "products"}
        </p>
        <div className="h-0.5 w-56 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div
            className="h-full rounded-full bg-fg transition-[width] duration-500 ease-out-soft"
            style={{ width: `${pct}%` }}
          />
        </div>

        {error ? (
          <p className="text-sm font-semibold text-sale">Couldn&apos;t load more products. Please try again.</p>
        ) : null}

        {hasMore ? (
          <Link
            href={nextHref}
            scroll={false}
            onClick={(e) => {
              e.preventDefault();
              loadMore();
            }}
            aria-disabled={pending}
            className="btn-outline mt-2 min-w-56 aria-disabled:pointer-events-none aria-disabled:opacity-60"
          >
            {pending ? (
              <>
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
                Loading…
              </>
            ) : error ? (
              "Try again"
            ) : (
              "Load more"
            )}
          </Link>
        ) : total > 0 ? (
          <>
            <button type="button" disabled className="btn mt-2 min-w-56 border border-line text-fg-muted opacity-100">
              No more products
            </button>
            <a href="#main" className="text-[13px] link-underline">
              Back to top
            </a>
          </>
        ) : null}
      </div>
    </>
  );
}
