import Link from "next/link";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { OrderStatusBadge, PaymentBadge } from "@/components/admin/order-badges";
import { SalesChart } from "@/components/admin/sales-chart";
import { getDashboard, parseRange, RANGE_LABELS, RANGES } from "@/lib/admin/dashboard";
import { formatPKR } from "@/lib/money";
import { pktDateTime } from "@/lib/pkt";
import {
  AlertCircle,
  ArrowRight,
  Box,
  Layers,
  Plus,
  Receipt,
  Star,
  Truck,
  Undo,
  WhatsApp,
} from "@/components/ui/icons";

export const metadata = { title: "Dashboard" };

const PREVIOUS = { today: "yesterday", "7d": "the 7 days before", "30d": "the 30 days before" };

function Change({ value, range }) {
  if (value == null) return <p className="mt-1 text-xs text-fg-muted">No sales {PREVIOUS[range]} to compare</p>;
  const pct = Math.round(value * 100);
  const tone = pct > 0 ? "text-success" : pct < 0 ? "text-sale" : "text-fg-muted";
  return (
    <p className="mt-1 text-xs text-fg-muted">
      <span className={`font-bold ${tone}`}>
        {pct > 0 ? "Up" : pct < 0 ? "Down" : "Same"}
        {pct ? ` ${Math.abs(pct)}%` : ""}
      </span>{" "}
      on {PREVIOUS[range]}
    </p>
  );
}

function Kpi({ label, value, change, range }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface px-4 py-4 sm:px-5">
      <p className="text-xs font-bold tracking-[0.06em] text-fg-muted uppercase">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold break-words tabular-nums sm:text-3xl">{value}</p>
      <Change value={change} range={range} />
    </div>
  );
}

function Task({ href, Icon, count, label, tone }) {
  const active = count > 0;
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full ${
            active
              ? tone === "danger"
                ? "bg-danger-bg text-sale"
                : "bg-warning-bg text-warning"
              : "bg-muted text-fg-muted"
          }`}
        >
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1 text-sm">
          <span className={`font-display text-xl font-semibold tabular-nums ${active ? "" : "text-fg-muted"}`}>
            {count}
          </span>{" "}
          <span className={active ? "font-semibold" : "text-fg-muted"}>{label}</span>
        </span>
        <ArrowRight className="size-4 text-fg-muted" />
      </Link>
    </li>
  );
}

export default withAdmin(async function DashboardPage({ admin, searchParams }) {
  const range = parseRange(await searchParams);
  const d = await getDashboard(range);
  const { attention: a, stock } = d;
  const firstName = admin.name?.split(" ")[0];

  return (
    <AdminPage
      title={firstName ? `Hello, ${firstName}` : "Dashboard"}
      description="How the store is doing and what needs doing."
      actions={
        <Link href="/admin/orders/new" className="btn-ink min-h-11">
          <Plus className="size-4" /> New order
        </Link>
      }
    >
      <nav aria-label="Period" className="mb-5 flex flex-wrap gap-2">
        {Object.keys(RANGES).map((r) => (
          <Link
            key={r}
            href={r === "7d" ? "/admin" : `/admin?range=${r}`}
            aria-current={range === r ? "page" : undefined}
            className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-[13px] font-bold hover:border-fg aria-[current=page]:border-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg"
          >
            {RANGE_LABELS[r]}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Sales" value={formatPKR(d.kpis.sales.value)} change={d.kpis.sales.change} range={range} />
        <Kpi label="Orders" value={d.kpis.orders.value} change={d.kpis.orders.change} range={range} />
        <Kpi
          label="Average order"
          value={formatPKR(d.kpis.average.value)}
          change={d.kpis.average.change}
          range={range}
        />
        <div className="min-w-0 rounded-2xl border border-line bg-surface px-4 py-4 sm:px-5">
          <p className="text-xs font-bold tracking-[0.06em] text-fg-muted uppercase">Cash on delivery</p>
          <p className="mt-1 font-display text-xl font-semibold break-words tabular-nums sm:text-3xl">
            {d.kpis.codShare == null ? "–" : `${Math.round(d.kpis.codShare * 100)}%`}
          </p>
          <p className="mt-1 text-xs text-fg-muted">of orders in this period</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-fg-muted">
        Sales are after refunds and leave out cancelled orders and card payments that didn&apos;t go through.
      </p>

      <div className="mt-6 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="chart-h">
          <h2 id="chart-h" className="mb-5 font-extrabold">
            Sales per day
          </h2>
          <SalesChart data={d.chart} />
        </section>

        <section className="rounded-2xl border border-line bg-surface p-3 sm:p-4" aria-labelledby="todo-h">
          <h2 id="todo-h" className="px-3 pt-2 pb-1 font-extrabold">
            Needs attention
          </h2>
          <ul>
            <Task href="/admin/orders?status=PENDING" Icon={Receipt} count={a.pending} label="new orders to confirm" />
            <Task href="/admin/messages" Icon={WhatsApp} count={a.messages} label="WhatsApp messages to send" />
            <Task href="/admin/orders?status=CONFIRMED" Icon={Box} count={a.toPack} label="orders to pack and ship" />
            <Task href="/admin/returns?status=REQUESTED" Icon={Undo} count={a.newReturns} label="return requests" />
            <Task
              href="/admin/returns?status=APPROVED"
              Icon={Truck}
              count={a.returnsToReceive}
              label="returns on the way back"
            />
            <Task href="/admin/reviews?status=PENDING" Icon={Star} count={a.reviews} label="reviews to approve" />
            <Task
              href="/admin/inventory?stock=out"
              Icon={AlertCircle}
              count={stock.out}
              label="sizes out of stock"
              tone="danger"
            />
            <Task href="/admin/inventory?stock=low" Icon={Layers} count={stock.low} label="sizes running low" />
          </ul>
        </section>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border border-line bg-surface" aria-labelledby="recent-h">
          <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
            <h2 id="recent-h" className="font-extrabold">
              Latest orders
            </h2>
            <Link href="/admin/orders" className="text-sm font-semibold hover:underline">
              All orders
            </Link>
          </div>
          {d.recent.length ? (
            <div className="relative mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-line text-xs font-bold tracking-[0.06em] text-fg-muted uppercase">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 sm:px-6">
                      Order
                    </th>
                    <th scope="col" className="px-3 py-2.5">
                      Customer
                    </th>
                    <th scope="col" className="px-3 py-2.5">
                      Status
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right sm:px-6">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.recent.map((o) => (
                    <tr key={o.id} className="border-b border-line last:border-0 hover:bg-muted/60">
                      <td className="px-5 py-3 sm:px-6">
                        <Link href={`/admin/orders/${o.id}`} className="font-bold hover:underline">
                          {o.orderNumber}
                        </Link>
                        <span className="block text-xs text-fg-muted">{pktDateTime.format(new Date(o.placedAt))}</span>
                      </td>
                      <td className="px-3 py-3">
                        {o.shipFullName}
                        <span className="block text-xs text-fg-muted">{o.shipCity}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="flex flex-wrap items-start gap-1">
                          <OrderStatusBadge status={o.status} />
                          <PaymentBadge method={o.paymentMethod} status={o.paymentStatus} />
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums sm:px-6">
                        {formatPKR(o.grandTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-8 text-sm text-fg-muted sm:px-6">No orders yet.</p>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="top-h">
          <h2 id="top-h" className="font-extrabold">
            Best sellers
          </h2>
          <p className="text-xs text-fg-muted">{RANGE_LABELS[range]}, by pairs sold</p>
          {d.top.length ? (
            <ol className="mt-3 grid gap-3">
              {d.top.map((t, i) => (
                <li key={`${t.productId}-${t.name}`} className="flex items-baseline gap-3 text-sm">
                  <span className="w-4 shrink-0 font-bold text-fg-muted tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    {t.productId ? (
                      <Link href={`/admin/products/${t.productId}`} className="font-semibold hover:underline">
                        {t.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{t.name}</span>
                    )}
                    <span className="block text-xs text-fg-muted">{formatPKR(t.revenue)}</span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {t.quantity} {t.quantity === 1 ? "pair" : "pairs"}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-fg-muted">No sales in this period yet.</p>
          )}
        </section>
      </div>
    </AdminPage>
  );
});
