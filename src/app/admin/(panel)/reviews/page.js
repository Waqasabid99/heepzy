import Image from "next/image";
import Link from "next/link";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Pagination } from "@/components/admin/ui";
import { ReviewActions } from "@/components/admin/review-actions";
import { listReviews, parseReviewParams, REVIEW_TABS } from "@/lib/admin/reviews";
import { FIT_LABELS } from "@/lib/reviews";
import { getSettingsForAdmin } from "@/lib/admin/settings";
import { pktDateTime } from "@/lib/pkt";
import { ExternalLink, Search, Star } from "@/components/ui/icons";

export const metadata = { title: "Reviews" };

const TAB_LABELS = { PENDING: "Waiting", APPROVED: "Published", REJECTED: "Not published" };
const STATUS_PILL = {
  PENDING: ["Waiting", "bg-warning-bg text-warning"],
  APPROVED: ["Published", "bg-success-bg text-success"],
  REJECTED: ["Not published", "bg-muted text-fg-muted"],
};

function Stars({ n }) {
  return (
    <span role="img" aria-label={`${n} out of 5 stars`} className="flex gap-0.5 text-saffron">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} filled={i < n} className={`size-4 ${i < n ? "" : "text-line"}`} />
      ))}
    </span>
  );
}

export default withAdmin(async function ReviewsPage({ searchParams }) {
  const filters = parseReviewParams(await searchParams);
  const [{ reviews, total, page, pageCount, counts }, settings] = await Promise.all([
    listReviews(filters),
    getSettingsForAdmin(),
  ]);
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const hrefFor = (p, patch = {}) => {
    const m = { ...filters, ...patch };
    const q = new URLSearchParams();
    q.set("status", m.status ?? "all");
    if (m.q) q.set("q", m.q);
    if (m.rating) q.set("rating", String(m.rating));
    if (p > 1) q.set("page", String(p));
    if (q.get("status") === "PENDING" && q.size === 1) return "/admin/reviews";
    return `/admin/reviews?${q}`;
  };

  return (
    <AdminPage
      title="Reviews"
      description={
        settings.reviewsRequireApproval
          ? "New reviews wait here until you publish them."
          : "Reviews go live straight away. Hide any that shouldn't be on the store."
      }
    >
      {!settings.reviewsEnabled ? (
        <p className="mb-5 rounded-xl bg-warning-bg p-4 text-sm text-warning">
          Reviews are switched off, so customers can&apos;t write new ones and none are shown on the store.{" "}
          <Link href="/admin/settings" className="font-semibold underline">
            Settings
          </Link>
        </p>
      ) : null}

      <nav aria-label="Review status" className="mb-5 flex flex-wrap gap-2">
        {[...REVIEW_TABS.map((s) => [s, TAB_LABELS[s], counts[s] ?? 0]), [null, "All", all]].map(([key, text, n]) => (
          <Link
            key={key ?? "all"}
            href={hrefFor(1, { status: key })}
            aria-current={filters.status === key ? "page" : undefined}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-bold hover:border-fg aria-[current=page]:border-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg"
          >
            {text}
            <span className="rounded-full bg-muted px-1.5 text-[11px] text-fg-muted">{n}</span>
          </Link>
        ))}
      </nav>

      <form role="search" className="mb-5 flex flex-wrap items-center gap-2">
        <input type="hidden" name="status" value={filters.status ?? "all"} />
        <div className="relative min-w-60 flex-1">
          <label htmlFor="rv-q" className="sr-only">
            Search reviews
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-muted" />
          <input
            id="rv-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Product, customer or words in the review"
            className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-sm"
          />
        </div>
        <label htmlFor="rv-r" className="sr-only">
          Rating
        </label>
        <select
          id="rv-r"
          name="rating"
          defaultValue={filters.rating ?? ""}
          className="h-11 rounded-full border border-line bg-surface px-4 text-sm"
        >
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "star" : "stars"}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-ink min-h-11">
          Search
        </button>
      </form>

      <p className="mb-3 text-sm text-fg-muted" role="status">
        {total} {total === 1 ? "review" : "reviews"}
      </p>

      {reviews.length ? (
        <ul className="grid gap-3">
          {reviews.map((r) => {
            const [pillText, pillCls] = STATUS_PILL[r.status];
            return (
              <li key={r.id} className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <Link
                    href={`/admin/products/${r.product.id}`}
                    className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted"
                    aria-label={`Product: ${r.product.name}`}
                  >
                    {r.product.image ? (
                      <Image src={r.product.image} alt="" fill sizes="56px" className="object-cover" />
                    ) : null}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Stars n={r.rating} />
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${pillCls}`}>{pillText}</span>
                      {r.fit ? <span className="text-xs font-semibold text-fg-muted">{FIT_LABELS[r.fit]}</span> : null}
                    </div>
                    <p className="mt-1 text-sm">
                      <Link href={`/admin/products/${r.product.id}`} className="font-bold hover:underline">
                        {r.product.name}
                      </Link>{" "}
                      <Link
                        href={`/products/${r.product.slug}#reviews`}
                        target="_blank"
                        className="inline-flex items-center gap-1 align-middle text-xs text-fg-muted hover:text-fg"
                      >
                        <ExternalLink className="size-3.5" />
                        <span className="sr-only">Open on the store (new tab)</span>
                      </Link>
                    </p>
                    <p className="text-xs text-fg-muted">
                      <Link href={`/admin/customers/${r.user.id}`} className="font-semibold hover:underline">
                        {r.user.name || r.user.email}
                      </Link>
                      {r.isVerifiedPurchase ? " · Verified purchase" : ""} · {pktDateTime.format(new Date(r.createdAt))}
                      {r.edited ? " · edited" : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-3 sm:pl-[72px]">
                  {r.title ? <p className="font-bold">{r.title}</p> : null}
                  {r.body ? <p className="mt-1 text-sm whitespace-pre-line">{r.body}</p> : null}
                  {r.adminReply ? (
                    <div className="mt-3 rounded-xl bg-muted p-3 text-sm">
                      <p className="text-xs font-bold text-fg-muted">Your reply</p>
                      <p className="mt-1 whitespace-pre-line">{r.adminReply}</p>
                    </div>
                  ) : null}
                  <div className="mt-4">
                    <ReviewActions review={{ id: r.id, status: r.status, adminReply: r.adminReply }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl border border-line bg-surface px-6 py-12 text-center text-sm text-fg-muted">
          {filters.status === "PENDING" && !filters.q && !filters.rating
            ? "No reviews waiting. New ones will show up here."
            : "No reviews match."}
        </p>
      )}

      <div className="mt-5">
        <Pagination page={page} pageCount={pageCount} hrefFor={hrefFor} />
      </div>
    </AdminPage>
  );
});
