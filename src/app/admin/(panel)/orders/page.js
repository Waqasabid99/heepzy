import Link from "next/link";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Pagination } from "@/components/admin/ui";
import { OrderStatusBadge, PaymentBadge } from "@/components/admin/order-badges";
import { listAdminOrders, ORDER_STATUSES, parseOrderListParams } from "@/lib/admin/orders";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import { formatPKR } from "@/lib/money";
import { Search } from "@/components/ui/icons";

export const metadata = { title: "Orders" };

const dateFmt = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Karachi",
});

export default withAdmin(async function OrdersPage({ searchParams }) {
  const filters = parseOrderListParams(await searchParams);
  const { orders, total, page, pageCount, counts } = await listAdminOrders(filters);
  const all = Object.values(counts).reduce((a, b) => a + b, 0);

  const hrefFor = (p, patch = {}) => {
    const m = { ...filters, ...patch };
    const q = new URLSearchParams();
    for (const k of ["q", "status", "payment", "method"]) if (m[k]) q.set(k, m[k]);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };
  const select = "h-11 rounded-full border border-line bg-surface px-4 text-sm font-semibold";

  return (
    <AdminPage
      title="Orders"
      description="Confirm, pack, ship and track orders. Cash on delivery and Safepay card payments."
    >
      <nav aria-label="Order status" className="mb-5 flex flex-wrap gap-2">
        {[[null, "All", all], ...ORDER_STATUSES.map((s) => [s, ORDER_STATUS_LABELS[s], counts[s] ?? 0])].map(
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
          <label htmlFor="o-q" className="sr-only">
            Search orders
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-muted" />
          <input
            id="o-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Order number, name, email or phone"
            className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-sm"
          />
        </div>
        <label htmlFor="o-method" className="sr-only">
          Payment method
        </label>
        <select id="o-method" name="method" defaultValue={filters.method ?? ""} className={select}>
          <option value="">Any method</option>
          <option value="COD">Cash on delivery</option>
          <option value="CARD">Card (Safepay)</option>
        </select>
        <label htmlFor="o-pay" className="sr-only">
          Payment status
        </label>
        <select id="o-pay" name="payment" defaultValue={filters.payment ?? ""} className={select}>
          <option value="">Any payment</option>
          <option value="PAID">Paid</option>
          <option value="UNPAID">Unpaid (COD)</option>
          <option value="PENDING">Awaiting payment</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <button type="submit" className="btn-ink min-h-11">
          Filter
        </button>
        {filters.q || filters.method || filters.payment ? (
          <Link href={hrefFor(1, { q: "", method: null, payment: null })} className="btn-ghost min-h-11 text-sm">
            Clear
          </Link>
        ) : null}
      </form>

      <p className="mb-3 text-sm text-fg-muted" role="status">
        {total} {total === 1 ? "order" : "orders"}
      </p>

      {orders.length ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line text-xs font-bold tracking-[0.06em] text-fg-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Order
                </th>
                <th scope="col" className="px-4 py-3">
                  Customer
                </th>
                <th scope="col" className="px-4 py-3">
                  Payment
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-muted/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-bold hover:underline">
                      {o.orderNumber}
                    </Link>
                    <span className="block text-xs text-fg-muted">{dateFmt.format(new Date(o.placedAt))}</span>
                  </td>
                  <td className="px-4 py-3">
                    {o.customer}
                    <span className="block text-xs text-fg-muted">
                      {o.city} · {o.pairs} {o.pairs === 1 ? "pair" : "pairs"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge method={o.paymentMethod} status={o.paymentStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-bold whitespace-nowrap">{formatPKR(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center font-bold">
          {filters.q || filters.status || filters.method || filters.payment ? "No orders match." : "No orders yet."}
        </p>
      )}

      <Pagination page={page} pageCount={pageCount} hrefFor={(p) => hrefFor(p)} />
    </AdminPage>
  );
});
