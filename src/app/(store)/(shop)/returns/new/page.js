import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderForViewer } from "@/lib/orders";
import { getStoreSettings } from "@/lib/settings";
import { openReturnQuantities, returnEligibility } from "@/lib/returns";
import { ReturnRequestForm } from "@/components/store/return-request-form";

export const metadata = { title: "Return or exchange", robots: { index: false } };

const dateFmt = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "long", timeZone: "Asia/Karachi" });

export default function NewReturnPage({ searchParams }) {
  return (
    <section className="container-page max-w-3xl py-10 lg:py-14" aria-labelledby="ret-title">
      <h1 id="ret-title" className="mb-2 display text-[clamp(36px,5vw,56px)]">
        Return or exchange
      </h1>
      <Suspense fallback={<p className="text-fg-muted">Loading your order…</p>}>
        <ReturnForm searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function ReturnForm({ searchParams }) {
  const sp = await searchParams;
  const orderNumber = typeof sp.order === "string" ? sp.order : "";
  const token = typeof sp.t === "string" ? sp.t : "";
  const order = await getOrderForViewer(orderNumber, token);
  if (!order) notFound();
  const settings = await getStoreSettings();
  const check = returnEligibility(order, settings, await openReturnQuantities(order.id));
  const back = `/checkout/complete/${order.orderNumber}${token ? `?t=${encodeURIComponent(token)}` : ""}`;

  if (!check.eligible) {
    return (
      <div className="rounded-tile bg-muted p-8">
        <p className="font-bold">Order {order.orderNumber}</p>
        <p className="mt-2">{check.why}</p>
        <Link href={back} className="btn-outline mt-5">
          Back to the order
        </Link>
      </div>
    );
  }
  return (
    <>
      <p className="mb-8 text-fg-muted">
        Order {order.orderNumber} · request by {dateFmt.format(check.deadline)}.{" "}
        <Link href="/account/returns" className="link-underline">
          Returns policy
        </Link>
      </p>
      <ReturnRequestForm
        orderNumber={order.orderNumber}
        token={token}
        items={check.items.map((i) => ({
          id: i.id,
          productName: i.productName,
          color: i.color,
          size: i.size,
          imageUrl: i.imageUrl,
          max: i.max,
        }))}
        refundsEnabled={settings.refundsEnabled}
      />
    </>
  );
}
