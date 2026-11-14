import Link from "next/link";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Notice } from "@/components/admin/ui";
import { StateBadge } from "@/components/admin/state-badge";
import { listOffers, parseOfferListParams } from "@/lib/admin/promotions";
import { scopeSummary } from "@/lib/admin/scope";
import { pktDateTime } from "@/lib/pkt";
import { Plus } from "@/components/ui/icons";

export const metadata = { title: "Offers" };

const TABS = [
  [null, "All", "all"],
  ["active", "Running", "active"],
  ["scheduled", "Scheduled", "scheduled"],
  ["ended", "Ended", "ended"],
  ["off", "Off", "off"],
];

export default withAdmin(async function OffersPage({ searchParams }) {
  const sp = await searchParams;
  const filters = parseOfferListParams(sp);
  const { offers, counts } = await listOffers(filters);

  return (
    <AdminPage
      title="Offers"
      description="Automatic sale prices on products, categories or brands. No code needed: customers see the lower price everywhere."
      actions={
        <Link href="/admin/promotions/new" className="btn-primary min-h-11">
          <Plus className="size-4" /> New offer
        </Link>
      }
    >
      {sp.deleted ? <Notice>Offer deleted. Prices are back to normal.</Notice> : null}
      <nav aria-label="Offer status" className="mb-5 flex flex-wrap gap-2">
        {TABS.map(([key, text, countKey]) => (
          <Link
            key={countKey}
            href={key ? `/admin/promotions?state=${key}` : "/admin/promotions"}
            aria-current={filters.state === key ? "page" : undefined}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-bold hover:border-fg aria-[current=page]:border-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg"
          >
            {text}
            <span className="rounded-full bg-muted px-1.5 text-[11px] text-fg-muted">{counts[countKey]}</span>
          </Link>
        ))}
      </nav>

      {offers.length ? (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="border-b border-line text-xs font-bold tracking-[0.06em] text-fg-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Offer
                </th>
                <th scope="col" className="px-4 py-3">
                  Discount
                </th>
                <th scope="col" className="px-4 py-3">
                  Runs
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Priority
                </th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-muted/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/promotions/${o.id}`} className="font-bold hover:underline">
                      {o.name}
                    </Link>
                    <span className="block text-xs text-fg-muted">{scopeSummary(o)}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{o.discount}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap text-fg-muted">
                    {o.startsAt ? `From ${pktDateTime.format(new Date(o.startsAt))}` : "Starts right away"}
                    <span className="block">
                      {o.endsAt ? `Until ${pktDateTime.format(new Date(o.endsAt))}` : "No end date"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StateBadge state={o.state} />
                  </td>
                  <td className="px-4 py-3 text-right">{o.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <p className="font-bold">{filters.state ? "No offers here." : "No offers yet."}</p>
          {!filters.state ? (
            <Link href="/admin/promotions/new" className="btn-primary mt-4 min-h-11">
              <Plus className="size-4" /> Create your first offer
            </Link>
          ) : null}
        </div>
      )}
    </AdminPage>
  );
});
