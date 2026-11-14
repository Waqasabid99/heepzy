import Image from "next/image";
import Link from "next/link";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Notice } from "@/components/admin/ui";
import { BannerRowActions } from "@/components/admin/banner-row-actions";
import { listBannersBySlot } from "@/lib/admin/banners";
import { pktDateTime } from "@/lib/pkt";
import { Plus } from "@/components/ui/icons";

export const metadata = { title: "Banners" };

const STATE = {
  live: ["Showing now", "bg-success-bg text-success"],
  waiting: ["Next in line", "bg-info-bg text-info"],
  scheduled: ["Scheduled", "bg-info-bg text-info"],
  ended: ["Ended", "bg-muted text-fg-muted"],
  off: ["Off", "bg-muted text-fg-muted"],
};

function dates(b) {
  const f = (d) => pktDateTime.format(new Date(d));
  if (b.startsAt && b.endsAt) return `${f(b.startsAt)} to ${f(b.endsAt)}`;
  if (b.startsAt) return `From ${f(b.startsAt)}`;
  if (b.endsAt) return `Until ${f(b.endsAt)}`;
  return "No end date";
}

export default withAdmin(async function BannersPage({ searchParams }) {
  const [slots, sp] = await Promise.all([listBannersBySlot(), searchParams]);
  return (
    <AdminPage
      title="Banners"
      description="The big banner and campaign tiles on the home page. Schedule them for sales and festivals; when nothing is scheduled, the standard design shows."
      actions={
        <Link href="/admin/content/new" className="btn-ink min-h-11">
          <Plus className="size-4" /> New banner
        </Link>
      }
    >
      {sp.saved ? <Notice>Banner saved. The home page is updated.</Notice> : null}
      <div className="grid gap-5">
        {slots.map((s) => (
          <section
            key={s.slot}
            className="rounded-2xl border border-line bg-surface"
            aria-labelledby={`slot-${s.slot}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
              <div>
                <h2 id={`slot-${s.slot}`} className="font-extrabold">
                  {s.label}
                </h2>
                <p className="text-[13px] text-fg-muted">
                  {s.usingDefault ? "Showing the standard design." : "Showing your banner."} {s.hint}
                </p>
              </div>
              <Link href={`/admin/content/new?slot=${s.slot}`} className="btn-outline min-h-10 text-sm">
                <Plus className="size-4" /> Add
              </Link>
            </div>
            {s.banners.length ? (
              <ul className="mt-3 divide-y divide-line border-t border-line">
                {s.banners.map((b) => {
                  const [label, cls] = STATE[b.state];
                  return (
                    <li key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-3 sm:px-6">
                      <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image src={b.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm">
                        <Link href={`/admin/content/${b.id}`} className="font-bold hover:underline">
                          {b.name}
                        </Link>
                        <span className="block text-xs text-fg-muted">{dates(b)}</span>
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{label}</span>
                      <span className="flex items-center gap-1">
                        <Link href={`/admin/content/${b.id}`} className="btn-ghost min-h-10 text-sm">
                          Edit
                        </Link>
                        <BannerRowActions id={b.id} isActive={b.isActive} name={b.name} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-5 pt-3 pb-5 text-sm text-fg-muted sm:px-6">No banners for this slot yet.</p>
            )}
            {s.banners.length ? <div className="pb-2" /> : null}
          </section>
        ))}
      </div>
    </AdminPage>
  );
});
