import Link from "next/link";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Notice, Pagination } from "@/components/admin/ui";
import { StateBadge } from "@/components/admin/state-badge";
import { listCoupons, parseCouponListParams } from "@/lib/admin/coupons";
import { scopeSummary } from "@/lib/admin/scope";
import { formatPKR } from "@/lib/money";
import { pktDate } from "@/lib/pkt";
import { Plus, Search } from "@/components/ui/icons";

export const metadata = { title: "Vouchers" };

const TABS = [
  [null, "All", "all"],
  ["active", "Active", "active"],
  ["scheduled", "Scheduled", "scheduled"],
  ["ended", "Ended", "ended"],
  ["off", "Off", "off"],
];

export default withAdmin(async function CouponsPage({ searchParams }) {
  const sp = await searchParams;
  const filters = parseCouponListParams(sp);
  const { coupons, total, page, pageCount, counts } = await listCoupons(filters);

  const hrefFor = (p, patch = {}) => {
    const m = { ...filters, ...patch };
    const q = new URLSearchParams();
    if (m.q) q.set("q", m.q);
    if (m.state) q.set("state", m.state);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/coupons${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPage
      title="Vouchers"
      description="Codes customers enter at checkout: percentage, fixed amount or free delivery, with limits and dates."
      actions={
        <Link href="/admin/coupons/new" className="btn-primary min-h-11">
          <Plus className="size-4" /> New voucher
        </Link>
      }
    >
      {sp.deleted ? <Notice>Voucher deleted.</Notice> : null}
      <nav aria-label="Voucher status" className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([key, text, countKey]) => (
          <Link
            key={countKey}
            href={hrefFor(1, { state: key })}
            aria-current={filters.state === key ? "page" : undefined}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-bold hover:border-fg aria-[current=page]:border-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg"
          >
            {text}
            <span className="rounded-full bg-muted px-1.5 text-[11px] text-fg-muted">{counts[countKey]}</span>
          </Link>
        ))}
      </nav>

      <form role="search" className="mb-5 flex flex-wrap items-center gap-2">
        {filters.state ? <input type="hidden" name="state" value={filters.state} /> : null}
        <div className="relative min-w-60 flex-1">
          <label htmlFor="v-q" className="sr-only">
            Search vouchers
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-muted" />
          <input
            id="v-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Code or description"
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

      {coupons.length ? (
        <div className="relative overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line text-xs font-bold tracking-[0.06em] text-fg-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Code
                </th>
                <th scope="col" className="px-4 py-3">
                  Discount
                </th>
                <th scope="col" className="px-4 py-3">
                  Dates
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Used
                </th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-muted/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/coupons/${c.id}`}
                      className="font-mono font-bold tracking-wider hover:underline"
                    >
                      {c.code}
                    </Link>
                    {c.description ? (
                      <span className="block max-w-xs truncate text-xs text-fg-muted">{c.description}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {c.discount}
                    <span className="block text-xs text-fg-muted">
                      {scopeSummary(c)}
                      {c.minOrderAmount ? ` · min ${formatPKR(c.minOrderAmount)}` : ""}
                      {c.firstOrderOnly ? " · first order" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap text-fg-muted">
                    {c.startsAt ? `From ${pktDate.format(new Date(c.startsAt))}` : "Any time"}
                    {c.endsAt ? <span className="block">Until {pktDate.format(new Date(c.endsAt))}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <StateBadge state={c.state} />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <span className="font-bold">
                      {c.usedCount}
                      {c.usageLimit ? ` / ${c.usageLimit}` : ""}
                    </span>
                    {c.given ? <span className="block text-xs text-fg-muted">{formatPKR(c.given)} given</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <p className="font-bold">{filters.q || filters.state ? "No vouchers match." : "No vouchers yet."}</p>
          {!filters.q && !filters.state ? (
            <Link href="/admin/coupons/new" className="btn-primary mt-4 min-h-11">
              <Plus className="size-4" /> Create your first voucher
            </Link>
          ) : null}
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} hrefFor={(p) => hrefFor(p)} />
    </AdminPage>
  );
});
