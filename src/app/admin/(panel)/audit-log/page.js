import Link from "next/link";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Pagination } from "@/components/admin/ui";
import { AREAS, listAuditLog, parseAuditParams } from "@/lib/admin/audit-log";
import { pktDateTime } from "@/lib/pkt";
import { Search } from "@/components/ui/icons";

export const metadata = { title: "Audit log" };

const ROLE = { admin: "Owner", manager: "Manager", user: "Customer" };
const PLACE = {
  StoreSettings: "Settings",
  PaymentGateway: "Payment settings",
  TaxRate: "Tax settings",
  DeliveryZone: "Delivery settings",
  User: "Customer",
  Coupon: "Voucher",
  Promotion: "Offer",
  Banner: "Banner",
  Review: "Reviews",
};
const select = "h-11 rounded-full border border-line bg-surface px-4 text-sm";

const label = (k) =>
  k
    .replace(/^rma/, "RMA")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

function show(v) {
  if (v == null || v === "") return "–";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v) && v.every((x) => typeof x !== "object")) return v.join(", ");
  if (typeof v === "object") return null;
  return String(v);
}

/** Simple fields inline; anything nested behind "More". */
function Details({ data }) {
  if (!data || typeof data !== "object") return null;
  const entries = Object.entries(data);
  const simple = entries.filter(([, v]) => show(v) !== null);
  const nested = entries.length > simple.length;
  return (
    <div className="mt-1 text-xs text-fg-muted">
      {simple.length ? (
        <dl className="flex flex-wrap gap-x-4 gap-y-0.5">
          {simple.slice(0, 8).map(([k, v]) => (
            <div key={k} className="flex gap-1">
              <dt>{label(k)}:</dt>
              <dd className="font-semibold break-all text-fg">{show(v)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {nested || simple.length > 8 ? (
        <details className="mt-1">
          <summary className="cursor-pointer font-semibold hover:text-fg">All details</summary>
          <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-[11px] whitespace-pre-wrap text-fg">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

export default withAdmin(
  async function AuditLogPage({ searchParams }) {
    const filters = parseAuditParams(await searchParams);
    const { entries, total, page, pageCount, staff } = await listAuditLog(filters);
    const filtered = filters.area || filters.actor || filters.q || filters.from || filters.to;
    const hrefFor = (p) => {
      const q = new URLSearchParams();
      for (const k of ["area", "actor", "q", "from", "to"]) if (filters[k]) q.set(k, filters[k]);
      if (p > 1) q.set("page", String(p));
      const s = q.toString();
      return `/admin/audit-log${s ? `?${s}` : ""}`;
    };

    return (
      <AdminPage title="Audit log" description="Who changed what in the store, and when. Only you can see this.">
        <form role="search" className="mb-5 flex flex-wrap items-end gap-2">
          <div className="relative min-w-56 flex-1">
            <label htmlFor="a-q" className="sr-only">
              Search
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-muted" />
            <input
              id="a-q"
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder="Action, record id or IP address"
              className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-sm"
            />
          </div>
          <label htmlFor="a-area" className="sr-only">
            Area
          </label>
          <select id="a-area" name="area" defaultValue={filters.area ?? ""} className={select}>
            <option value="">All areas</option>
            {Object.entries(AREAS).map(([k, a]) => (
              <option key={k} value={k}>
                {a.label}
              </option>
            ))}
          </select>
          <label htmlFor="a-actor" className="sr-only">
            Person
          </label>
          <select id="a-actor" name="actor" defaultValue={filters.actor ?? ""} className={select}>
            <option value="">Everyone</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label htmlFor="a-from" className="text-[13px] font-semibold">
              From
            </label>
            <input id="a-from" name="from" type="date" defaultValue={filters.from} className={select} />
            <label htmlFor="a-to" className="text-[13px] font-semibold">
              to
            </label>
            <input id="a-to" name="to" type="date" defaultValue={filters.to} className={select} />
          </div>
          <button type="submit" className="btn-ink min-h-11">
            Filter
          </button>
          {filtered ? (
            <Link href="/admin/audit-log" className="btn-ghost min-h-11 text-sm">
              Clear
            </Link>
          ) : null}
        </form>

        <p className="mb-3 text-sm text-fg-muted" role="status">
          {total} {total === 1 ? "entry" : "entries"}
        </p>

        {entries.length ? (
          <ol className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {entries.map((e) => (
              <li key={e.id} className="grid gap-1 px-5 py-4 sm:grid-cols-[170px_1fr] sm:gap-5">
                <div className="text-xs text-fg-muted">
                  <time dateTime={e.at}>{pktDateTime.format(new Date(e.at))}</time>
                  {e.ip ? <span className="block">IP {e.ip}</span> : null}
                </div>
                <div className="min-w-0 text-sm">
                  <p>
                    <span className="font-bold">{e.actor ? e.actor.name : "System"}</span>
                    {e.actor ? (
                      <span className="ml-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
                        {ROLE[e.actor.role] ?? e.actor.role}
                      </span>
                    ) : null}
                    <span className="text-fg-muted"> · </span>
                    {e.what}
                    {e.href ? (
                      <>
                        {" "}
                        <Link href={e.href} className="font-semibold underline-offset-2 hover:underline">
                          {e.subject ?? PLACE[e.entity] ?? "Open"}
                        </Link>
                      </>
                    ) : e.subject ? (
                      <span className="font-semibold"> {e.subject}</span>
                    ) : null}
                  </p>
                  <Details data={e.metadata} />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-2xl border border-line bg-surface px-6 py-12 text-center text-sm text-fg-muted">
            {filtered ? "Nothing matches these filters." : "Nothing has been recorded yet."}
          </p>
        )}

        <div className="mt-5">
          <Pagination page={page} pageCount={pageCount} hrefFor={hrefFor} />
        </div>
      </AdminPage>
    );
  },
  { ownerOnly: true },
);
