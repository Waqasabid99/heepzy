import Link from "next/link";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Pagination } from "@/components/admin/ui";
import { listCustomers, parseCustomerListParams } from "@/lib/admin/customers";
import { formatPKR } from "@/lib/money";
import { pktDate } from "@/lib/pkt";
import { isStaff, ROLE_LABELS } from "@/lib/roles";
import { Plus, Search } from "@/components/ui/icons";

export const metadata = { title: "Customers" };

const TABS = [
  [null, "All customers", "all"],
  ["buyers", "Have ordered", "buyers"],
  ["none", "No orders yet", "none"],
  ["banned", "Blocked", "banned"],
  ["staff", "Staff", "staff"],
];

export default withAdmin(async function CustomersPage({ searchParams }) {
  const filters = parseCustomerListParams(await searchParams);
  const { customers, total, page, pageCount, counts } = await listCustomers(filters);

  const hrefFor = (p, patch = {}) => {
    const m = { ...filters, ...patch };
    const q = new URLSearchParams();
    if (m.q) q.set("q", m.q);
    if (m.filter) q.set("filter", m.filter);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/customers${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPage
      title="Customers"
      description="Registered accounts with their orders and spend. Guest checkouts appear under Orders."
      actions={
        <Link href="/admin/customers/new" className="btn-primary min-h-11">
          <Plus className="size-4" /> New customer
        </Link>
      }
    >
      <nav aria-label="Customer filter" className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([key, text, countKey]) => (
          <Link
            key={countKey}
            href={hrefFor(1, { filter: key })}
            aria-current={filters.filter === key ? "page" : undefined}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-bold hover:border-fg aria-[current=page]:border-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg"
          >
            {text}
            <span className="rounded-full bg-muted px-1.5 text-[11px] text-fg-muted">{counts[countKey]}</span>
          </Link>
        ))}
      </nav>

      <form role="search" className="mb-5 flex flex-wrap items-center gap-2">
        {filters.filter ? <input type="hidden" name="filter" value={filters.filter} /> : null}
        <div className="relative min-w-60 flex-1">
          <label htmlFor="c-q" className="sr-only">
            Search customers
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-muted" />
          <input
            id="c-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Name, email or phone"
            className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-sm"
          />
        </div>
        <button type="submit" className="btn-ink min-h-11">
          Search
        </button>
        {filters.q ? (
          <Link href={hrefFor(1, { q: "" })} className="btn-ghost min-h-11 text-sm">
            Clear
          </Link>
        ) : null}
      </form>

      <p className="mb-3 text-sm text-fg-muted" role="status">
        {total} {total === 1 ? "account" : "accounts"}
      </p>

      {customers.length ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs font-bold tracking-[0.06em] text-fg-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3">
                  Phone
                </th>
                <th scope="col" className="px-4 py-3">
                  Joined
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Orders
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Spent
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-muted/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${c.id}`} className="font-bold hover:underline">
                      {c.name || "No name"}
                    </Link>
                    {c.banned ? (
                      <span className="ml-2 rounded-full bg-danger-bg px-2 py-0.5 text-[11px] font-bold text-sale">
                        Blocked
                      </span>
                    ) : null}
                    {isStaff(c.role) ? (
                      <span className="ml-2 rounded-full bg-info-bg px-2 py-0.5 text-[11px] font-bold text-info">
                        {ROLE_LABELS[c.role]}
                      </span>
                    ) : null}
                    <span className="block text-xs text-fg-muted">{c.email}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{c.phone || <span className="text-fg-muted">—</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{pktDate.format(new Date(c.createdAt))}</td>
                  <td className="px-4 py-3 text-right">
                    {c.orders}
                    {c.lastOrderAt ? (
                      <span className="block text-xs text-fg-muted">
                        last {pktDate.format(new Date(c.lastOrderAt))}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                    {c.spent ? formatPKR(c.spent) : <span className="font-normal text-fg-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center font-bold">
          {filters.q || filters.filter ? "No customers match." : "No customers yet."}
        </p>
      )}

      <Pagination page={page} pageCount={pageCount} hrefFor={(p) => hrefFor(p)} />
    </AdminPage>
  );
});
