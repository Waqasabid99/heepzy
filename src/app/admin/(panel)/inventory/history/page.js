import Link from "next/link";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, AdminTabs, Pagination } from "@/components/admin/ui";
import { INVENTORY_TABS, listMovements, parseHistoryParams, REASON_LABELS } from "@/lib/admin/inventory";

export const metadata = { title: "Stock history" };

const dateFmt = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Karachi",
});

export default withAdmin(async function StockHistoryPage({ searchParams }) {
  const filters = parseHistoryParams(await searchParams);
  const { rows, total, page, pageCount, focus } = await listMovements(filters);

  const hrefFor = (p, patch = {}) => {
    const merged = { ...filters, ...patch };
    const q = new URLSearchParams();
    if (merged.variant) q.set("variant", merged.variant);
    if (merged.reason) q.set("reason", merged.reason);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/inventory/history${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPage title="Inventory" description="Every stock change: restocks, corrections, damages, returns and orders.">
      <AdminTabs label="Inventory" tabs={INVENTORY_TABS} current="/admin/inventory/history" />

      {focus ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4">
          <p className="text-sm">
            Showing history for{" "}
            <Link href={`/admin/products/${focus.product.id}`} className="font-bold hover:underline">
              {focus.product.name}
            </Link>{" "}
            · {focus.color} · size {focus.size} · <span className="font-mono text-xs">{focus.sku}</span> ·{" "}
            <strong>{focus.stock}</strong> in stock now
          </p>
          <Link href={hrefFor(1, { variant: null })} className="btn-ghost min-h-10 text-sm">
            Show all sizes
          </Link>
        </div>
      ) : null}

      <nav aria-label="Filter by reason" className="mb-5 flex flex-wrap gap-2">
        {[[null, "All"], ...Object.entries(REASON_LABELS)].map(([key, text]) => (
          <Link
            key={key ?? "all"}
            href={hrefFor(1, { reason: key })}
            aria-current={filters.reason === key ? "page" : undefined}
            className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-[13px] font-bold hover:border-fg aria-[current=page]:border-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg"
          >
            {text}
          </Link>
        ))}
      </nav>

      <p className="mb-3 text-sm text-fg-muted" role="status">
        {total} {total === 1 ? "movement" : "movements"}
      </p>

      {rows.length ? (
        <div className="relative overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line text-xs font-bold tracking-[0.06em] text-fg-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  When
                </th>
                <th scope="col" className="px-4 py-3">
                  Product
                </th>
                <th scope="col" className="px-4 py-3">
                  Reason
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Change
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Stock after
                </th>
                <th scope="col" className="px-4 py-3">
                  By
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-line align-top last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-fg-muted">{dateFmt.format(new Date(m.createdAt))}</td>
                  <td className="px-4 py-3">
                    <Link href={hrefFor(1, { variant: m.variantId })} className="font-bold hover:underline">
                      {m.productName}
                    </Link>
                    <span className="block text-xs text-fg-muted">
                      {m.color} · size {m.size} · <span className="font-mono">{m.sku}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {REASON_LABELS[m.reason] ?? m.reason}
                    {m.note ? <span className="block text-xs text-fg-muted">{m.note}</span> : null}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-bold tabular-nums ${m.change > 0 ? "text-success" : "text-sale"}`}
                  >
                    {m.change > 0 ? `+${m.change}` : m.change}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{m.stockAfter ?? "–"}</td>
                  <td className="px-4 py-3 text-fg-muted">{m.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-6 py-14 text-center font-bold">
          No stock movements yet.
        </p>
      )}

      <Pagination page={page} pageCount={pageCount} hrefFor={(p) => hrefFor(p)} />
    </AdminPage>
  );
});
