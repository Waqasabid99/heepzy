import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getStoreSettings } from "@/lib/settings";
import { formatPKR } from "@/lib/money";
import {
  openReturnQuantities,
  RESOLUTION_LABELS,
  RETURN_STATUS_LABELS,
  returnEligibility,
  returnsForOrder,
} from "@/lib/returns";
import { Exchange, Video } from "@/components/ui/icons";

export const metadata = {
  title: "Returns & exchange",
  description: "How to return or exchange shoes bought from Heepzy.",
};

const dateFmt = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });

export default function ReturnsPage() {
  return (
    <section aria-labelledby="returns-title">
      <h1 id="returns-title" className="mb-6 display text-[clamp(36px,4vw,52px)]">
        Returns &amp; exchange
      </h1>
      <Suspense fallback={<p className="text-fg-muted">Loading…</p>}>
        <Policy />
      </Suspense>
      <Suspense fallback={null}>
        <MyReturns />
      </Suspense>
    </section>
  );
}

async function Policy() {
  const s = await getStoreSettings();
  if (!s.returnsEnabled) {
    return (
      <div className="rounded-tile bg-muted p-8">
        <p className="font-bold">We&apos;re not accepting returns online right now.</p>
        <p className="mt-2 text-fg-muted">Please contact us if there&apos;s a problem with your order.</p>
      </div>
    );
  }
  const custom = s.returnPolicy?.trim();
  return (
    <div className="grid gap-4">
      <div className="rounded-tile bg-muted p-6 sm:p-8">
        <p className="flex items-center gap-2 text-lg font-extrabold">
          <Exchange className="size-5" /> {s.returnWindowDays}-day{" "}
          {s.refundsEnabled ? "returns and exchange" : "exchange"}
        </p>
        {custom ? (
          <div className="mt-3 grid gap-2 text-[15px] leading-relaxed whitespace-pre-line">{custom}</div>
        ) : (
          <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-[15px] leading-relaxed">
            <li>Request within {s.returnWindowDays} days of delivery, from your order page.</li>
            <li>Damaged or wrong item? Add photos and your unboxing video to the request.</li>
            <li>Shoes must be unworn, clean and in their original box.</li>
            <li>
              Exchange for another size or colour{s.refundsEnabled ? ", or get a refund once we receive the shoes" : ""}
              .
            </li>
            <li>We&apos;ll call or WhatsApp you to arrange the pickup.</li>
          </ul>
        )}
      </div>
      <p className="flex items-start gap-3 rounded-tile border border-line bg-surface p-5 text-[15px]">
        <Video className="mt-0.5 size-5 shrink-0 text-brand" />
        <span>
          <span className="font-bold">Record an unboxing video when your parcel arrives.</span> Film it from sealed
          parcel to shoes out of the box. If anything is damaged or wrong, the video and photos are the quickest way for
          us to approve your return.
        </span>
      </p>
    </div>
  );
}

async function MyReturns() {
  const [user, settings] = await Promise.all([getCurrentUser(), getStoreSettings()]);
  if (!settings.returnsEnabled) return null;
  if (!user) {
    return (
      <p className="mt-8 text-fg-muted">
        <Link href="/login?next=/account/returns" className="font-semibold text-fg link-underline">
          Sign in
        </Link>{" "}
        to return something, or open the link from your order confirmation if you checked out as a guest.
      </p>
    );
  }
  const orders = await db.order.findMany({
    where: { userId: user.id, status: { in: ["DELIVERED", "RETURNED"] } },
    orderBy: { deliveredAt: "desc" },
    take: 20,
    include: { items: true },
  });
  const rows = await Promise.all(
    orders.map(async (o) => {
      const [openQty, returns] = await Promise.all([openReturnQuantities(o.id), returnsForOrder(o.id)]);
      return { order: o, check: returnEligibility(o, settings, openQty), returns };
    }),
  );
  const eligible = rows.filter((r) => r.check.eligible);
  const requests = rows.flatMap((r) => r.returns.map((x) => ({ ...x, orderNumber: r.order.orderNumber })));

  return (
    <div className="mt-10 grid gap-10">
      <section aria-labelledby="can-return">
        <h2 id="can-return" className="mb-4 text-xl font-extrabold">
          Orders you can return
        </h2>
        {eligible.length ? (
          <ul className="grid gap-3">
            {eligible.map(({ order, check }) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5"
              >
                <span className="text-sm">
                  <span className="block font-bold">{order.orderNumber}</span>
                  <span className="block text-fg-muted">
                    {order.items.map((i) => i.productName).join(", ")} · until {dateFmt.format(check.deadline)}
                  </span>
                </span>
                <Link href={`/returns/new?order=${order.orderNumber}`} className="btn-outline min-h-11">
                  Return or exchange
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fg-muted">No delivered orders are inside the return window.</p>
        )}
      </section>

      {requests.length ? (
        <section aria-labelledby="my-requests">
          <h2 id="my-requests" className="mb-4 text-xl font-extrabold">
            Your return requests
          </h2>
          <ul className="grid gap-3">
            {requests.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/checkout/complete/${r.orderNumber}#returns`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 text-sm hover:border-fg"
                >
                  <span>
                    <span className="block font-bold">
                      {r.rmaNumber} · {RESOLUTION_LABELS[r.resolution]}
                    </span>
                    <span className="block text-fg-muted">
                      Order {r.orderNumber}
                      {r.refunded ? ` · refunded ${formatPKR(r.refunded)}` : ""}
                    </span>
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold">
                    {RETURN_STATUS_LABELS[r.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
