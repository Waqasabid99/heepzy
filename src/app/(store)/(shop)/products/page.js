import { Suspense } from "react";
import Link from "next/link";
import { getFacets, listProducts, PAGE_SIZE, parseFilters, SORTS } from "@/lib/catalog";
import { InfiniteProducts } from "@/components/store/infinite-products";
import { formatPKR } from "@/lib/money";
import { FilterDrawer } from "@/components/store/filter-drawer";
import { PriceRange } from "@/components/store/price-range";
import { SortMenu } from "@/components/store/sort-menu";

export const metadata = {
  title: "Shop shoes",
  description: "Sneakers, formal shoes, heels, boots and canvas — delivered across Pakistan with cash on delivery.",
};

const GENDERS = [
  ["", "All"],
  ["men", "Men"],
  ["women", "Women"],
];

export default function ProductsPage({ searchParams }) {
  return (
    <Suspense fallback={<CollectionSkeleton />}>
      <Collection searchParams={searchParams} />
    </Suspense>
  );
}

/** Build a /products URL from filters, with overrides (null/false/"" removes a key). */
function hrefWith(f, overrides = {}) {
  const next = { ...f, page: 1, ...overrides };
  const qs = new URLSearchParams();
  if (next.gender) qs.set("gender", next.gender);
  for (const c of next.category) qs.append("category", c);
  for (const s of next.size) qs.append("size", s);
  if (next.sale) qs.set("sale", "1");
  if (next.min != null) qs.set("min", next.min);
  if (next.max != null) qs.set("max", next.max);
  if (next.q) qs.set("q", next.q);
  if (next.sort !== "featured") qs.set("sort", next.sort);
  if (next.page > 1) qs.set("page", next.page);
  const s = qs.toString();
  return s ? `/products?${s}` : "/products";
}

const genderName = (g) => GENDERS.find(([v]) => v === g)?.[1];

async function Collection({ searchParams }) {
  const sp = await searchParams;
  const f = parseFilters(sp);
  // Render pages 1…N so /products?page=N (written by infinite scroll) restores the same list.
  const [{ products, total, page }, facets] = await Promise.all([listProducts(f, "through"), getFacets()]);
  // Query without `page`, passed to the client for fetching further pages.
  const query = Object.fromEntries(Object.entries(sp).filter(([k]) => k !== "page"));

  const catName = (slug) => facets.categories.find((c) => c.slug === slug)?.name ?? slug;
  const title =
    f.category.length === 1
      ? `${f.gender ? `${genderName(f.gender)}'s ` : ""}${catName(f.category[0])}`
      : f.gender
        ? `${genderName(f.gender)}'s shoes`
        : f.sale
          ? "On sale"
          : f.sort === "newest"
            ? "New in"
            : "All shoes";

  const active = [
    ...(f.gender ? [{ label: genderName(f.gender), href: hrefWith(f, { gender: null }) }] : []),
    ...f.category.map((c) => ({
      label: catName(c),
      href: hrefWith(f, { category: f.category.filter((x) => x !== c) }),
    })),
    ...f.size.map((s) => ({ label: `EU ${s}`, href: hrefWith(f, { size: f.size.filter((x) => x !== s) }) })),
    ...(f.sale ? [{ label: "On sale", href: hrefWith(f, { sale: false }) }] : []),
    ...(f.min != null || f.max != null
      ? [
        {
          label: f.max != null ? `${formatPKR(f.min ?? 0)} – ${formatPKR(f.max)}` : `From ${formatPKR(f.min)}`,
          href: hrefWith(f, { min: null, max: null }),
        },
      ]
      : []),
    ...(f.q ? [{ label: `“${f.q}”`, href: hrefWith(f, { q: "" }) }] : []),
  ];
  const drawerCount = active.length - (f.q ? 1 : 0);

  // Quick links row (New in · categories · All shoes) — keep gender, reset the rest.
  const base = { ...parseFilters({}), gender: f.gender };
  const quick = [
    { label: "New in", href: hrefWith(base, { sort: "newest" }), on: f.sort === "newest" && !f.category.length },
    ...facets.categories.map((c) => ({
      label: c.name,
      href: hrefWith(base, { category: [c.slug] }),
      on: f.category.length === 1 && f.category[0] === c.slug,
    })),
    { label: "All shoes", href: hrefWith(base), on: !f.category.length && f.sort !== "newest" && !f.sale },
  ];

  const sortOptions = Object.entries(SORTS).map(([value, { label }]) => ({
    value,
    label,
    href: hrefWith(f, { sort: value }),
    active: f.sort === value,
  }));

  return (
    <div className="container-page pt-10 pb-28">
      <nav aria-label="Breadcrumb" className="text-[13px] text-fg-muted">
        <ol className="flex gap-2">
          <li>
            <Link href="/" className="hover:text-fg">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-fg">
            {title}
          </li>
        </ol>
      </nav>

      <h1 className="mt-5 display text-[clamp(48px,6vw,88px)]">{title}</h1>

      <nav aria-label="Shop by category" className="mt-7">
        <ul className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <li key={q.label}>
              <Link
                href={q.href}
                aria-current={q.on ? "page" : undefined}
                className="chip px-5 tracking-[0.06em] uppercase"
              >
                {q.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* ───── Toolbar ───── */}
      <div className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-t-card border-b border-fg bg-muted px-5 py-3 sm:px-7">
        <div>
          <FilterDrawer activeCount={drawerCount}>
            <form method="get" action="/products" className="flex min-h-0 flex-1 flex-col">
              {f.sort !== "featured" ? <input type="hidden" name="sort" value={f.sort} /> : null}
              {f.q ? <input type="hidden" name="q" value={f.q} /> : null}

              <div className="flex flex-1 flex-col gap-9 overflow-y-auto px-6 py-7 sm:px-8">
                <fieldset>
                  <legend className="sr-only">Shop for</legend>
                  <div className="flex flex-wrap gap-2">
                    {GENDERS.map(([value, label]) => (
                      <label
                        key={label}
                        className="chip cursor-pointer px-5 tracking-[0.06em] uppercase has-checked:border-fg has-checked:bg-fg has-checked:text-bg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
                      >
                        <input
                          type="radio"
                          name="gender"
                          value={value}
                          defaultChecked={(f.gender ?? "") === value}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-3.5 font-bold">Category</legend>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                    {facets.categories.map((c) => (
                      <label key={c.slug} className="flex min-h-8 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          name="category"
                          value={c.slug}
                          defaultChecked={f.category.includes(c.slug)}
                          className="size-4.5 accent-fg"
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <div className="mb-3.5 flex items-baseline justify-between">
                    <legend className="font-bold">Size (EU)</legend>
                    <Link href="/size-guide" className="text-[13px] link-underline">
                      Size guide
                    </Link>
                  </div>
                  {/* Joined grid of cells, as in the reference design. */}
                  <div className="grid grid-cols-5 border-t border-l border-fg/70">
                    {facets.sizes.map((s) => (
                      <label
                        key={s}
                        className="grid min-h-12 cursor-pointer place-items-center border-r border-b border-fg/70 text-sm font-medium transition-colors hover:bg-muted has-checked:bg-fg has-checked:text-bg has-focus-visible:outline-2 has-focus-visible:-outline-offset-4 has-focus-visible:outline-ring"
                      >
                        <input
                          type="checkbox"
                          name="size"
                          value={s}
                          defaultChecked={f.size.includes(s)}
                          className="sr-only"
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <PriceRange ceiling={facets.priceMax} defaultMin={f.min} defaultMax={f.max} />

                <label className="-mt-3 flex cursor-pointer items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="sale"
                    value="1"
                    defaultChecked={f.sale}
                    className="size-4.5 accent-fg"
                  />
                  On sale only
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-line px-6 py-5 sm:px-8">
                <Link href={f.q ? `/products?q=${encodeURIComponent(f.q)}` : "/products"} className="btn-outline">
                  Clear
                </Link>
                <button type="submit" className="btn-ink tracking-[0.08em] uppercase">
                  Apply
                </button>
              </div>
            </form>
          </FilterDrawer>
        </div>

        <p className="text-sm tracking-wide" role="status">
          {total} {total === 1 ? "product" : "products"}
        </p>

        <div className="justify-self-end">
          <SortMenu options={sortOptions} currentLabel={SORTS[f.sort].label} />
        </div>
      </div>

      {active.length ? (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {active.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-accent py-1 pr-2 pl-3.5 text-xs font-bold text-accent-fg"
            >
              {a.label}
              <span className="sr-only">, remove filter</span>
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </Link>
          ))}
          <Link href="/products" className="ml-1 text-[13px] text-fg-muted link-underline">
            Clear all
          </Link>
        </div>
      ) : null}

      {/* ───── Results (infinite scroll) ───── */}
      <section aria-label="Products" className="mt-8">
        {products.length ? (
          <InfiniteProducts
            key={JSON.stringify(query)}
            initialProducts={products}
            total={total}
            initialPage={page}
            query={query}
            pageSize={PAGE_SIZE}
          />
        ) : (
          <div className="rounded-card bg-muted p-12 text-center">
            <p className="heading text-3xl">Nothing matches — yet.</p>
            <p className="mt-2 text-fg-muted">Try removing a filter or browse everything.</p>
            <Link href="/products" className="btn-ink mt-6">
              Browse all shoes
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function CollectionSkeleton() {
  return (
    <div className="container-page pt-10 pb-28" aria-busy="true">
      <p className="sr-only" role="status">
        Loading products…
      </p>
      <div className="mt-10 h-20 w-80 rounded-2xl bg-muted" />
      <div className="mt-10 h-14 rounded-t-card bg-muted" />
      <div className="mt-8 grid gap-x-4 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-square bg-muted" />
        ))}
      </div>
    </div>
  );
}
