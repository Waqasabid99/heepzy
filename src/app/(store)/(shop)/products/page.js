import { Suspense } from "react";
import Link from "next/link";
import { getFacets, listProducts, parseFilters } from "@/lib/catalog";
import { ProductCard } from "@/components/store/product-card";
import { SortSelect } from "@/components/store/sort-select";

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

/** Build a /products URL from filters, with overrides (null removes a key). */
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

async function Collection({ searchParams }) {
  const f = parseFilters(await searchParams);
  const [{ products, total, page, pageCount }, facets] = await Promise.all([listProducts(f), getFacets()]);

  const catName = (slug) => facets.categories.find((c) => c.slug === slug)?.name ?? slug;
  const title =
    f.category.length === 1
      ? `${f.gender ? `${GENDERS.find((g) => g[0] === f.gender)?.[1]}'s ` : ""}${catName(f.category[0])}`
      : f.gender
        ? `${GENDERS.find((g) => g[0] === f.gender)?.[1]}'s shoes`
        : f.sale
          ? "On sale"
          : "All shoes";

  const active = [
    ...f.category.map((c) => ({
      label: catName(c),
      href: hrefWith(f, { category: f.category.filter((x) => x !== c) }),
    })),
    ...f.size.map((s) => ({ label: `EU ${s}`, href: hrefWith(f, { size: f.size.filter((x) => x !== s) }) })),
    ...(f.sale ? [{ label: "On sale", href: hrefWith(f, { sale: false }) }] : []),
    ...(f.min != null || f.max != null
      ? [{ label: `Rs ${f.min ?? 0} – ${f.max ?? "∞"}`, href: hrefWith(f, { min: null, max: null }) }]
      : []),
    ...(f.q ? [{ label: `“${f.q}”`, href: hrefWith(f, { q: "" }) }] : []),
  ];
  const from = total === 0 ? 0 : (page - 1) * 12 + 1;
  const to = Math.min(page * 12, total);

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

      <div className="mt-5 mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="display text-[clamp(48px,6vw,88px)]">{title}</h1>
          <p className="mt-3 text-fg-muted">
            {total} {total === 1 ? "style" : "styles"} · free delivery on orders over Rs 5,000
          </p>
        </div>
        <nav aria-label="Shop by" className="flex flex-wrap gap-2">
          {GENDERS.map(([value, label]) => (
            <Link
              key={label}
              href={hrefWith(f, { gender: value || null })}
              aria-current={(f.gender ?? "") === value ? "page" : undefined}
              className="chip"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <form method="get" action="/products" className="flex flex-wrap items-start gap-10">
        {f.gender ? <input type="hidden" name="gender" value={f.gender} /> : null}
        {f.q ? <input type="hidden" name="q" value={f.q} /> : null}

        {/* ───── Filters ───── */}
        <aside aria-label="Filters" className="flex w-full flex-col gap-7 lg:sticky lg:top-28 lg:w-72">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-extrabold tracking-[0.12em] uppercase">Filters</h2>
            <Link
              href={f.gender ? `/products?gender=${f.gender}` : "/products"}
              className="text-[13px] text-fg-muted link-underline"
            >
              Clear all
            </Link>
          </div>

          <fieldset className="border-b border-line pb-7">
            <legend className="mb-3.5 font-bold">Category</legend>
            <div className="grid gap-2.5 text-sm">
              {facets.categories.map((c) => (
                <label key={c.slug} className="flex min-h-7 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name="category"
                    value={c.slug}
                    defaultChecked={f.category.includes(c.slug)}
                    className="size-[18px] accent-fg"
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="border-b border-line pb-7">
            <legend className="mb-3.5 font-bold">Size (EU)</legend>
            <div className="grid grid-cols-4 gap-2">
              {facets.sizes.map((s) => (
                <label
                  key={s}
                  className="grid min-h-11 cursor-pointer place-items-center rounded-control border border-line bg-surface text-sm font-semibold transition-colors has-checked:border-fg has-checked:bg-fg has-checked:text-bg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
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
            <Link href="/size-guide" className="mt-3 inline-block text-[13px] link-underline">
              Size guide
            </Link>
          </fieldset>

          <fieldset className="border-b border-line pb-7">
            <legend className="mb-3.5 font-bold">Price (Rs)</legend>
            <div className="flex items-center gap-2.5">
              <label className="flex-1">
                <span className="sr-only">Minimum price</span>
                <input
                  name="min"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Min"
                  defaultValue={f.min ?? ""}
                  className="input min-h-11"
                />
              </label>
              <span aria-hidden="true" className="text-fg-muted">
                –
              </span>
              <label className="flex-1">
                <span className="sr-only">Maximum price</span>
                <input
                  name="max"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Max"
                  defaultValue={f.max ?? ""}
                  className="input min-h-11"
                />
              </label>
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm">
              <input type="checkbox" name="sale" value="1" defaultChecked={f.sale} className="size-[18px] accent-fg" />
              On sale only
            </label>
          </fieldset>

          <button type="submit" className="btn-ink w-full">
            Apply filters
          </button>
        </aside>

        {/* ───── Results ───── */}
        <section aria-label="Products" className="min-w-0 flex-[999_1_560px]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="mr-1 text-[13px] text-fg-muted" role="status">
                {total ? `Showing ${from}–${to} of ${total}` : "No results"}
              </p>
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
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="sort" className="text-[13px] font-semibold">
                Sort by
              </label>
              <SortSelect defaultValue={f.sort} />
            </div>
          </div>

          {products.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((p, i) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  priority={i < 3}
                  sizes="(min-width: 1280px) 22vw, (min-width: 640px) 45vw, 92vw"
                />
              ))}
            </div>
          ) : (
            <div className="rounded-card bg-muted p-12 text-center">
              <p className="heading text-3xl">Nothing matches — yet.</p>
              <p className="mt-2 text-fg-muted">Try removing a filter or browse everything.</p>
              <Link href="/products" className="btn-ink mt-6">
                Browse all shoes
              </Link>
            </div>
          )}

          {pageCount > 1 ? (
            <nav aria-label="Pagination" className="mt-16 flex justify-center">
              <ul className="flex gap-2">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <li key={n}>
                    <Link
                      href={hrefWith(f, { page: n })}
                      aria-current={n === page ? "page" : undefined}
                      className="grid size-11 place-items-center rounded-full border border-line font-semibold aria-[current=page]:border-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg"
                    >
                      {n}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </section>
      </form>
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
      <div className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="aspect-[5/5.2] rounded-card bg-muted" />
        ))}
      </div>
    </div>
  );
}
