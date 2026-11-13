import Link from "next/link";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, AdminTabs, Pagination, StatCard } from "@/components/admin/ui";
import { InventoryTable } from "@/components/admin/inventory-table";
import {
  getInventoryStats,
  INVENTORY_TABS,
  listInventory,
  MANUAL_REASONS,
  parseInventoryParams,
} from "@/lib/admin/inventory";
import { getProductFormOptions } from "@/lib/admin/products";
import { formatPKR } from "@/lib/money";
import { Search } from "@/components/ui/icons";

export const metadata = { title: "Inventory" };

export default withAdmin(async function InventoryPage({ searchParams }) {
  const filters = parseInventoryParams(await searchParams);
  const [stats, { rows, total, page, pageCount, low }, { categories }] = await Promise.all([
    getInventoryStats(),
    listInventory(filters),
    getProductFormOptions(),
  ]);

  const hrefFor = (p, patch = {}) => {
    const q = new URLSearchParams();
    const merged = { ...filters, ...patch };
    for (const k of ["q", "stock", "category"]) if (merged[k]) q.set(k, merged[k]);
    if (merged.sort && merged.sort !== "product") q.set("sort", merged.sort);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/inventory${s ? `?${s}` : ""}`;
  };
  const select = "h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold";
  const filtered = filters.q || filters.stock || filters.category;

  return (
    <AdminPage
      title="Inventory"
      description="Stock for every colour and size. Adjust counts and see where every pair went."
    >
      <AdminTabs label="Inventory" tabs={INVENTORY_TABS} current="/admin/inventory" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Pairs in stock"
          value={stats.units.toLocaleString("en-PK")}
          hint={`${stats.variants} sizes on sale`}
        />
        <StatCard
          label="Stock value"
          value={formatPKR(stats.retail)}
          hint={stats.cost != null ? `${formatPKR(stats.cost)} at cost` : "At selling price"}
        />
        <Link
          href={hrefFor(1, { stock: "low", sort: "stock-asc" })}
          className="rounded-2xl hover:ring-2 hover:ring-line"
        >
          <StatCard
            label="Low stock"
            value={stats.lowCount}
            hint={`${low} pairs or fewer`}
            tone={stats.lowCount ? "warning" : undefined}
          />
        </Link>
        <Link href={hrefFor(1, { stock: "out" })} className="rounded-2xl hover:ring-2 hover:ring-line">
          <StatCard
            label="Sold out"
            value={stats.outCount}
            hint="Sizes with no stock"
            tone={stats.outCount ? "danger" : undefined}
          />
        </Link>
      </div>

      <form role="search" className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <label htmlFor="inv-q" className="sr-only">
            Search by product, colour or SKU
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-muted" />
          <input
            id="inv-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Search by product, colour or SKU"
            className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-sm"
          />
        </div>
        <label htmlFor="inv-stock" className="sr-only">
          Stock level
        </label>
        <select id="inv-stock" name="stock" defaultValue={filters.stock ?? ""} className={select}>
          <option value="">Any stock</option>
          <option value="in">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Sold out</option>
        </select>
        <label htmlFor="inv-cat" className="sr-only">
          Category
        </label>
        <select id="inv-cat" name="category" defaultValue={filters.category ?? ""} className={select}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <label htmlFor="inv-sort" className="sr-only">
          Sort
        </label>
        <select id="inv-sort" name="sort" defaultValue={filters.sort} className={select}>
          <option value="product">Product A–Z</option>
          <option value="stock-asc">Lowest stock first</option>
          <option value="stock-desc">Highest stock first</option>
        </select>
        <button type="submit" className="btn-ink min-h-11">
          Filter
        </button>
        {filtered || filters.sort !== "product" ? (
          <Link href="/admin/inventory" className="btn-ghost min-h-11 text-sm">
            Clear
          </Link>
        ) : null}
      </form>

      <p className="mb-3 text-sm text-fg-muted" role="status">
        {total} {total === 1 ? "size" : "sizes"}
      </p>

      {rows.length ? (
        <InventoryTable rows={rows} reasons={MANUAL_REASONS} />
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center font-bold">
          {filtered ? "Nothing matches these filters." : "No products with sizes yet."}
        </p>
      )}

      <Pagination page={page} pageCount={pageCount} hrefFor={(p) => hrefFor(p)} />
    </AdminPage>
  );
});
