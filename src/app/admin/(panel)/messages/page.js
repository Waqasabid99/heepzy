import Link from "next/link";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Pagination } from "@/components/admin/ui";
import { MessageCard } from "@/components/admin/message-card";
import { listMessages, MESSAGE_TABS, parseMessageParams } from "@/lib/admin/messages";

export const metadata = { title: "WhatsApp messages" };

const TAB_LABELS = { PENDING: "To send", SENT: "Sent", SKIPPED: "Dismissed" };

export default withAdmin(async function MessagesPage({ searchParams }) {
  const filters = parseMessageParams(await searchParams);
  const { messages, total, page, pageCount, counts } = await listMessages(filters);
  const hrefFor = (p, status = filters.status) => {
    const q = new URLSearchParams();
    if (status !== "PENDING") q.set("status", status);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/messages${s ? `?${s}` : ""}`;
  };

  return (
    <AdminPage
      title="WhatsApp messages"
      description="Order updates for customers, written and ready. Tap Send on WhatsApp, then press send in WhatsApp. Use the phone or computer that has the store's WhatsApp."
      actions={
        <Link href="/admin/settings/messages" className="btn-outline min-h-11 text-sm">
          Edit wording
        </Link>
      }
    >
      <nav aria-label="Message status" className="mb-5 flex flex-wrap gap-2">
        {MESSAGE_TABS.map((s) => (
          <Link
            key={s}
            href={hrefFor(1, s)}
            aria-current={filters.status === s ? "page" : undefined}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-bold hover:border-fg aria-[current=page]:border-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg"
          >
            {TAB_LABELS[s]}
            <span className="rounded-full bg-muted px-1.5 text-[11px] text-fg-muted">{counts[s] ?? 0}</span>
          </Link>
        ))}
      </nav>

      {messages.length ? (
        <ul className="grid gap-3 xl:grid-cols-2">
          {messages.map((m) => (
            <li key={m.id}>
              <MessageCard message={m} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-line bg-surface px-6 py-12 text-center text-sm text-fg-muted">
          {filters.status === "PENDING"
            ? "All caught up. New messages appear here when you confirm, ship or deliver an order."
            : `No ${TAB_LABELS[filters.status].toLowerCase()} messages yet.`}
        </p>
      )}
      {total > messages.length ? (
        <div className="mt-5">
          <Pagination page={page} pageCount={pageCount} hrefFor={(p) => hrefFor(p)} />
        </div>
      ) : null}
    </AdminPage>
  );
});
