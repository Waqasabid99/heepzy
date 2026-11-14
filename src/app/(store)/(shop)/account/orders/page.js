import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/orders";
import { formatPKR } from "@/lib/money";

export const metadata = { title: "My orders", robots: { index: false } };

const dateFmt = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Karachi",
});

export default function MyOrdersPage() {
  return (
    <section aria-labelledby="orders-title">
      <h1 id="orders-title" className="mb-6 display text-[clamp(36px,4vw,52px)]">
        My orders
      </h1>
      <Suspense fallback={<p className="text-fg-muted">Loading your orders…</p>}>
        <OrderList />
      </Suspense>
    </section>
  );
}

async function OrderList() {
  const user = await requireUser("/login?next=/account/orders");
  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { placedAt: "desc" },
    take: 50,
    select: {
      orderNumber: true,
      placedAt: true,
      status: true,
      paymentStatus: true,
      grandTotal: true,
      items: { select: { quantity: true } },
    },
  });

  if (!orders.length) {
    return (
      <div className="rounded-tile bg-muted px-6 py-16 text-center">
        <p className="heading text-3xl">No orders yet.</p>
        <Link href="/products" className="btn-primary mt-6">
          Start shopping
        </Link>
      </div>
    );
  }
  return (
    <ul className="grid gap-3">
      {orders.map((o) => {
        const pairs = o.items.reduce((n, i) => n + i.quantity, 0);
        return (
          <li key={o.orderNumber}>
            <Link
              href={`/checkout/complete/${o.orderNumber}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5 hover:border-fg"
            >
              <span>
                <span className="block font-bold">{o.orderNumber}</span>
                <span className="block text-sm text-fg-muted">
                  {dateFmt.format(o.placedAt)} · {pairs} {pairs === 1 ? "pair" : "pairs"}
                </span>
              </span>
              <span className="text-right text-sm">
                <span className="block font-bold">{formatPKR(Number(o.grandTotal))}</span>
                <span className="block text-fg-muted">
                  {ORDER_STATUS_LABELS[o.status]} · {PAYMENT_STATUS_LABELS[o.paymentStatus]}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
