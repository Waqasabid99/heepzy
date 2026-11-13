import Image from "next/image";
import Link from "next/link";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Notice, Pagination, StatusBadge } from "@/components/admin/ui";
import { getProductFormOptions, listAdminProducts, parseProductListParams } from "@/lib/admin/products";
import { formatPKR } from "@/lib/money";
import { Plus, Search } from "@/components/ui/icons";

export const metadata = { title: "Products" };

const GENDER = { MEN: "Men", WOMEN: "Women", UNISEX: "Unisex", KIDS: "Kids" };

export default withAdmin(async function ProductsPage({ searchParams }) {
  const sp = await searchParams;
  const filters = parseProductListParams(sp);
  const [{ products, total, page, pageCount, lowStockThreshold }, { categories }] = await Promise.all([
    listAdminProducts(filters),
    getProductFormOptions(),
  ]);

  const hrefFor = (p) => {
    const q = new URLSearchParams();
    for (const k of ["q", "status", "category", "stock"]) if (filters[k]) q.set(k, filters[k]);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/products${s ? `?${s}` : ""}`;
  };
  const filtered = filters.q || filters.status || filters.category || filters.stock;
  const select =
    "h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-fg focus-visible:border-fg";

  return (
    <AdminPage
      title="Products"
      description="Your catalogue: prices, photos, colours and sizes. Only Active products appear in the store."
      actions={
        <Link href="/admin/products/new" className="btn-ink">
          <Plus className="size-4" /> Add product
        </Link>
      }
    >
      {sp.deleted ? <Notice>Product deleted.</Notice> : null}

      <form role="search" className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <label htmlFor="q" className="sr-only">
            Search products
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-muted" />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Search by name or SKU"
            className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-sm"
          />
        </div>
        <label className="sr-only" htmlFor="status">
          Status
        </label>
        <select id="status" name="status" defaultValue={filters.status ?? ""} className={select}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <label className="sr-only" htmlFor="category">
          Category
        </label>
        <select id="category" name="category" defaultValue={filters.category ?? ""} className={select}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="stock">
          Stock
        </label>
        <select id="stock" name="stock" defaultValue={filters.stock ?? ""} className={select}>
          <option value="">Any stock</option>
          <option value="low">Low stock (≤ {lowStockThreshold})</option>
          <option value="out">Sold out</option>
        </select>
        <button type="submit" className="btn-ink min-h-11">
          Filter
        </button>
        {filtered ? (
          <Link href="/admin/products" className="btn-ghost min-h-11 text-sm">
            Clear
          </Link>
        ) : null}
      </form>

      <p className="mb-3 text-sm text-fg-muted" role="status">
        {total} {total === 1 ? "product" : "products"}
      </p>

      {products.length ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs font-bold tracking-[0.06em] text-fg-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Product
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Price
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Stock
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-muted/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${p.id}`} className="group flex items-center gap-3">
                      <span className="relative size-12 shrink-0 overflow-hidden bg-muted">
                        {p.image ? <Image src={p.image} alt="" fill sizes="48px" className="object-cover" /> : null}
                      </span>
                      <span>
                        <span className="block font-bold group-hover:underline">{p.name}</span>
                        <span className="block text-xs text-fg-muted">
                          {GENDER[p.gender]}
                          {p.featured ? " · Featured" : ""}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{p.categories.join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {p.compareAt ? <s className="mr-1.5 text-xs text-fg-muted">{formatPKR(p.compareAt)}</s> : null}
                    <span className={p.compareAt ? "font-bold text-sale" : "font-bold"}>{formatPKR(p.price)}</span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className={p.stock === 0 ? "font-bold text-sale" : "font-semibold"}>{p.stock}</span>
                    <span className="block text-xs text-fg-muted">
                      {p.variantCount} {p.variantCount === 1 ? "size" : "sizes"}
                      {p.soldOutVariants ? ` · ${p.soldOutVariants} sold out` : ""}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line px-6 py-16 text-center">
          <p className="font-bold">{filtered ? "No products match these filters." : "No products yet."}</p>
          <Link href="/admin/products/new" className="btn-ink mt-4">
            <Plus className="size-4" /> Add your first product
          </Link>
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} hrefFor={hrefFor} />
    </AdminPage>
  );
});
