import Link from "next/link";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Pagination } from "@/components/admin/ui";
import { ReturnStatusBadge } from "@/components/admin/return-badge";
import { listReturns, parseReturnListParams, RETURN_STATUSES } from "@/lib/admin/returns";
import { RESOLUTION_LABELS, RETURN_REASON_LABELS } from "@/lib/returns";
import { pktDateTime } from "@/lib/pkt";
import { Search } from "@/components/ui/icons";

export const metadata = { title: "Returns & refunds" };

const TAB_LABELS = {
  REQUESTED: "New",
  APPROVED: "Approved",
  RECEIVED: "Received",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export default withAdmin(async function ReturnsPage({ searchParams }) {
  const filters = parseReturnListParams(await searchParams);
  const { returns, total, page, pageCount, counts } = await listReturns(filters);
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const hrefFor = (p, patch = {}) => {
    const m = { ...filters, ...patch };
    const q = new URLSearchParams();
    if (m.status) q.set("status", m.status);
    if (m.q) q.set("q", m.q);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/returns${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPage
      title="Returns & refunds"
      description="Review return and exchange requests, receive the shoes, then refund or exchange."
    >
      <nav aria-label="Return status" className="mb-5 flex flex-wrap gap-2">
        {[[null, "All", all], ...RETURN_STATUSES.map((s) => [s, TAB_LABELS[s], counts[s] ?? 0])].map(
          ([key, text, n]) => (
            <Link
              key={key ?? "all"}
              href={hrefFor(1, { status: key })}
              aria-current={filters.status === key ? "page" : undefined}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-bold hover:border-fg aria-[current=page]:border-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg"
            >
              {text}
              <span className="rounded-full bg-muted px-1.5 text-[11px] text-fg-muted">{n}</span>
            </Link>
          ),
        )}
      </nav>

      <form role="search" className="mb-5 flex flex-wrap items-center gap-2">
        {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
        <div className="relative min-w-60 flex-1">
          <label htmlFor="r-q" className="sr-only">
            Search returns
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-muted" />
          <input
            id="r-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="RMA, order number, name or phone"
            className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-sm"
          />
        </div>
        <button type="submit" className="btn-ink min-h-11">
          Search
        </button>
      </form>

      <p className="mb-3 text-sm text-fg-muted" role="status">
        {total} {total === 1 ? "return" : "returns"}
      </p>
      {returns.length ? (
        <div className="relative overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs font-bold tracking-[0.06em] text-fg-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Return
                </th>
                <th scope="col" className="px-4 py-3">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3">
                  Reason
                </th>
                <th scope="col" className="px-4 py-3">
                  Wants
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-muted/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/returns/${r.id}`} className="font-bold hover:underline">
                      {r.rmaNumber}
                    </Link>
                    <span className="block text-xs text-fg-muted">
                      {r.order.orderNumber} · {pktDateTime.format(new Date(r.createdAt))}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.order.shipFullName}
                    <span className="block text-xs text-fg-muted">
                      {r.order.shipCity} · {r.pairs} {r.pairs === 1 ? "pair" : "pairs"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{RETURN_REASON_LABELS[r.reason]}</td>
                  <td className="px-4 py-3">{RESOLUTION_LABELS[r.resolution]}</td>
                  <td className="px-4 py-3">
                    <ReturnStatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center font-bold">
          {filters.status || filters.q ? "No returns match." : "No return requests yet."}
        </p>
      )}
      <Pagination page={page} pageCount={pageCount} hrefFor={(p) => hrefFor(p)} />
    </AdminPage>
  );
});
