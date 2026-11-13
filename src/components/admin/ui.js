import Link from "next/link";
import { AlertCircle, ArrowLeft, Check } from "@/components/ui/icons";

/** Standard admin page frame: title row with actions, then content. */
export function AdminPage({ title, description, actions, back, children }) {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-8 sm:py-8">
      {back ? (
        <Link
          href={back.href}
          className="mb-3 inline-flex min-h-8 items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" /> {back.label}
        </Link>
      ) : null}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="page-title" className="font-display text-[34px] leading-tight font-semibold uppercase sm:text-[40px]">
            {title}
          </h1>
          {description ? <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

const STATUS_STYLES = {
  ACTIVE: "bg-success-bg text-success",
  DRAFT: "bg-warning-bg text-warning",
  ARCHIVED: "bg-muted text-fg-muted",
};
const STATUS_LABELS = { ACTIVE: "Active", DRAFT: "Draft", ARCHIVED: "Archived" };

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[status] ?? "bg-muted"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function Notice({ tone = "success", children }) {
  const cls =
    tone === "success"
      ? "bg-success-bg text-success"
      : tone === "error"
        ? "bg-danger-bg text-sale"
        : "bg-info-bg text-info";
  const Icon = tone === "success" ? Check : AlertCircle;
  return (
    <p role="status" className={`mb-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${cls}`}>
      <Icon className="size-4 shrink-0" />
      {children}
    </p>
  );
}

/** Page links that keep the current filters. `hrefFor(page)` builds each URL. */
export function Pagination({ page, pageCount, hrefFor }) {
  if (pageCount <= 1) return null;
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount])].filter((p) => p >= 1 && p <= pageCount);
  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center justify-center gap-1.5">
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - pages[i - 1] > 1 ? <span aria-hidden="true">…</span> : null}
          <Link
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className="grid size-10 place-items-center rounded-full border border-line text-sm font-semibold hover:border-fg aria-[current=page]:border-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg"
          >
            {p}
          </Link>
        </span>
      ))}
    </nav>
  );
}

/** Simple tab links between related admin pages. `current` is the active tab's href. */
export function AdminTabs({ tabs, current, label }) {
  return (
    <nav aria-label={label} className="mb-6 border-b border-line">
      <ul className="flex gap-6">
        {tabs.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={t.href === current ? "page" : undefined}
              className="-mb-px inline-flex min-h-11 items-center border-b-2 border-transparent text-sm font-bold text-fg-muted hover:text-fg aria-[current=page]:border-accent aria-[current=page]:text-fg"
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Small KPI tile. */
export function StatCard({ label, value, hint, tone }) {
  const toneCls = tone === "danger" ? "text-sale" : tone === "warning" ? "text-warning" : "text-fg";
  return (
    <div className="rounded-2xl border border-line bg-surface px-5 py-4">
      <p className="text-xs font-bold tracking-[0.06em] text-fg-muted uppercase">{label}</p>
      <p className={`mt-1 font-display text-3xl font-semibold ${toneCls}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}
