import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { ReturnStatusBadge } from "@/components/admin/return-badge";
import { ReturnActions, ReturnNote } from "@/components/admin/return-actions";
import { getReturn } from "@/lib/admin/returns";
import { REFUND_METHOD_LABELS, RESOLUTION_LABELS, RETURN_REASON_LABELS } from "@/lib/returns";
import { PROVINCES } from "@/lib/checkout";
import { formatPKR } from "@/lib/money";
import { pktDate, pktDateTime } from "@/lib/pkt";

export const metadata = { title: "Return" };

const EVENT = {
  "return.request": "Requested by the customer",
  "return.cancel": "Cancelled",
  "return.approve": "Approved",
  "return.reject": "Rejected",
  "return.receive": "Received",
  "return.refund": "Refunded",
  "return.complete": "Completed",
  "return.note": "Note updated",
};
const CONDITION = { UNWORN: "Unworn", WORN: "Worn", DAMAGED: "Damaged" };

export default withAdmin(async function ReturnPage({ params }) {
  const { id } = await params;
  const r = await getReturn(id);
  if (!r) notFound();
  const wa = r.order.phone.replace(/^0/, "92");
  const media = Array.isArray(r.imageUrls) ? r.imageUrls.filter((m) => m && typeof m.name === "string") : [];

  return (
    <AdminPage
      title={r.rmaNumber}
      description={`${RESOLUTION_LABELS[r.resolution]} · ${RETURN_REASON_LABELS[r.reason]} · requested ${pktDateTime.format(new Date(r.createdAt))}`}
      back={{ href: "/admin/returns", label: "Returns" }}
      actions={<ReturnStatusBadge status={r.status} />}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid content-start gap-5">
          <section aria-labelledby="ri-h" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 id="ri-h" className="mb-4 font-extrabold">
              Items
            </h2>
            <ul className="grid gap-4">
              {r.items.map((i) => (
                <li key={i.id} className="flex gap-3 text-sm">
                  <span className="relative size-16 shrink-0 bg-muted">
                    {i.orderItem.imageUrl ? (
                      <Image src={i.orderItem.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                    ) : null}
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold">{i.orderItem.productName}</span>
                    <span className="block text-fg-muted">
                      {i.orderItem.color} · Size {i.orderItem.size} ·{" "}
                      <span className="font-mono text-xs">{i.orderItem.sku}</span>
                    </span>
                    <span className="block">
                      {i.quantity} of {i.orderItem.quantity} · {formatPKR(i.orderItem.unitPrice)} each
                    </span>
                    {i.condition ? (
                      <span className="block text-fg-muted">
                        {CONDITION[i.condition]}
                        {i.restock ? " · back in stock" : " · not restocked"}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            {r.customerNote ? (
              <div className="mt-5 rounded-xl bg-warning-bg p-4 text-sm text-warning">
                <p className="font-extrabold">Customer says</p>
                <p className="mt-1">{r.customerNote}</p>
              </div>
            ) : null}
            {r.adminNote && r.status === "REJECTED" ? (
              <p className="mt-3 text-sm">
                <span className="font-bold">Rejected because:</span> {r.adminNote}
              </p>
            ) : null}
          </section>

          <section aria-labelledby="rm-h" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 id="rm-h" className="mb-3 font-extrabold">
              Photos and video from the customer
            </h2>
            {media.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {media.map((m, i) => {
                  const src = `/api/returns/media/${r.order.id}/${m.name}`;
                  return (
                    <li key={m.name} className="overflow-hidden rounded-xl border border-line bg-muted">
                      {m.kind === "video" ? (
                        <video
                          src={src}
                          controls
                          preload="metadata"
                          playsInline
                          className="aspect-video w-full bg-fg"
                          aria-label={`Customer video ${i + 1}`}
                        />
                      ) : (
                        <a href={src} target="_blank" rel="noopener noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element -- private, staff-only file */}
                          <img
                            src={src}
                            alt={`Customer photo ${i + 1}`}
                            className="aspect-square w-full object-cover"
                          />
                          <span className="sr-only">(opens full size in a new tab)</span>
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-fg-muted">None added.</p>
            )}
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <section aria-labelledby="ro-h" className="rounded-2xl border border-line bg-surface p-5 text-sm">
              <h2 id="ro-h" className="mb-2 font-extrabold">
                Order
              </h2>
              <p>
                <Link href={`/admin/orders/${r.order.id}`} className="font-bold hover:underline">
                  {r.order.orderNumber}
                </Link>
              </p>
              <p className="text-fg-muted">
                Delivered {r.order.deliveredAt ? pktDate.format(new Date(r.order.deliveredAt)) : "—"}
              </p>
              <p className="text-fg-muted">
                Total {formatPKR(r.order.grandTotal)}
                {Number(r.order.refundedTotal) ? ` · refunded ${formatPKR(r.order.refundedTotal)}` : ""}
              </p>
            </section>
            <section aria-labelledby="rc-h" className="rounded-2xl border border-line bg-surface p-5 text-sm">
              <h2 id="rc-h" className="mb-2 font-extrabold">
                Pickup from
              </h2>
              <p>
                {r.order.shipFullName}
                <br />
                {r.order.shipLine1}
                {r.order.shipLine2 ? `, ${r.order.shipLine2}` : ""}
                <br />
                {r.order.shipCity}, {PROVINCES[r.order.shipProvince]}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-3">
                <a href={`tel:${r.order.shipPhone}`} className="hover:underline">
                  {r.order.shipPhone}
                </a>
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-success hover:underline"
                >
                  WhatsApp<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            </section>
          </div>

          {r.refunds.length ? (
            <section aria-labelledby="rf-h" className="rounded-2xl border border-line bg-surface p-5 text-sm">
              <h2 id="rf-h" className="mb-3 font-extrabold">
                Refunds
              </h2>
              <ul className="grid gap-2">
                {r.refunds.map((f) => (
                  <li key={f.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-muted px-3 py-2">
                    <span>
                      {REFUND_METHOD_LABELS[f.method]}
                      {f.providerRefundId ? <span className="font-mono text-xs"> · {f.providerRefundId}</span> : null}
                      <span className="block text-xs text-fg-muted">
                        {f.processedAt ? pktDateTime.format(new Date(f.processedAt)) : ""}
                      </span>
                    </span>
                    <span className="font-bold">{formatPKR(f.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="rh-h" className="rounded-2xl border border-line bg-surface p-5 text-sm">
            <h2 id="rh-h" className="mb-3 font-extrabold">
              Timeline
            </h2>
            <ol className="grid gap-3 border-l-2 border-line pl-4">
              {r.history.map((h) => (
                <li key={h.id} className="relative">
                  <span aria-hidden="true" className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-fg" />
                  <span className="font-semibold">{EVENT[h.action] ?? h.action}</span>
                  <span className="text-fg-muted">
                    {" "}
                    · {pktDateTime.format(new Date(h.createdAt))} · {h.actor?.name ?? "Customer"}
                  </span>
                  {h.metadata?.note ? <span className="block text-fg-muted">{h.metadata.note}</span> : null}
                  {h.action === "return.refund" && h.metadata?.amount ? (
                    <span className="block text-fg-muted">{formatPKR(h.metadata.amount)}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-6 lg:self-start">
          <ReturnActions ret={r} />
          <ReturnNote returnId={r.id} initial={r.status === "REJECTED" ? "" : r.adminNote} />
        </aside>
      </div>
    </AdminPage>
  );
});
