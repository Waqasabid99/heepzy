import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderForViewer, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/orders";
import { PROVINCES } from "@/lib/checkout";
import { formatPKR } from "@/lib/money";
import { RetryPayment } from "@/components/store/retry-payment";
import { AlertCircle, Check, Clock } from "@/components/ui/icons";

export const metadata = { title: "Your order", robots: { index: false } };

export default function OrderCompletePage({ params, searchParams }) {
  return (
    <section className="container-page max-w-4xl py-10 lg:py-14">
      <Suspense fallback={<p className="text-fg-muted">Loading your order…</p>}>
        <OrderView params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function OrderView({ params, searchParams }) {
  const [{ orderNumber }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.t === "string" ? sp.t : "";
  const order = await getOrderForViewer(orderNumber, token);
  if (!order) notFound();

  const isCard = order.paymentMethod === "CARD";
  const paid = order.paymentStatus === "PAID";
  const cancelled = order.status === "CANCELLED";
  const awaiting = isCard && !paid && !cancelled;
  const canRetry = awaiting && order.status === "PENDING";

  let tone = "success";
  let Icon = Check;
  let title = "Thank you! Your order is placed.";
  let text = `We'll call or WhatsApp you on ${order.phone} to confirm, then pack your order. Pay the rider in cash on delivery.`;
  // An order the shop created with a card-payment link: no Safepay attempt yet.
  const notStarted = awaiting && !order.payments[0]?.providerPaymentId;
  if (order.paymentMethod === "MANUAL") {
    title = "Thank you! Your order is confirmed.";
    text = "Your payment has been received. We're getting your order ready and will keep you updated.";
  } else if (isCard && paid) {
    title = "Payment received. Thank you!";
    text = "Your order is confirmed and we're getting it ready. We'll send updates by email and SMS.";
  } else if (notStarted) {
    tone = "info";
    Icon = Clock;
    title = "Complete your payment";
    text = "Your order is ready. Pay securely by card or wallet through Safepay to confirm it.";
  } else if (awaiting && sp.payment === "cancelled") {
    tone = "warning";
    Icon = AlertCircle;
    title = "Payment not completed";
    text = "Your order is saved but not paid yet. You can try the payment again.";
  } else if (awaiting) {
    tone = "info";
    Icon = Clock;
    title = "We're confirming your payment";
    text =
      "Safepay is still processing your payment. This usually takes a moment. Refresh this page, or try again if the payment didn't go through.";
  } else if (cancelled) {
    tone = "warning";
    Icon = AlertCircle;
    title = "This order was cancelled";
    text = "If you have questions, contact us and quote your order number.";
  }
  const toneCls = {
    success: "bg-success-bg text-success",
    warning: "bg-warning-bg text-warning",
    info: "bg-info-bg text-info",
  }[tone];

  return (
    <>
      <div className={`flex gap-4 rounded-tile p-6 sm:p-8 ${toneCls}`}>
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface">
          <Icon className="size-6" />
        </span>
        <div>
          <p className="text-sm font-bold">Order {order.orderNumber}</p>
          <h1 className="mt-1 font-display text-[clamp(30px,4vw,44px)] leading-tight font-semibold uppercase">
            {title}
          </h1>
          <p className="mt-2 max-w-2xl text-fg">{text}</p>
          {canRetry ? (
            <div className="mt-5">
              <RetryPayment
                orderNumber={order.orderNumber}
                token={token}
                label={`Pay ${formatPKR(order.grandTotal)} now`}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="items-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <h2 id="items-title" className="mb-4 text-lg font-extrabold">
            Items
          </h2>
          <ul className="grid gap-4">
            {order.items.map((it) => (
              <li key={it.id} className="flex gap-3">
                <span className="relative size-16 shrink-0 bg-muted">
                  {it.imageUrl ? <Image src={it.imageUrl} alt="" fill sizes="64px" className="object-cover" /> : null}
                </span>
                <span className="flex-1 text-sm">
                  <span className="block font-bold">{it.productName}</span>
                  <span className="block text-fg-muted">
                    {it.color} · Size {it.size} · Qty {it.quantity}
                  </span>
                </span>
                <span className="text-sm font-semibold">{formatPKR(it.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-5 grid gap-1.5 border-t border-line pt-4 text-sm">
            <Row term="Subtotal" value={formatPKR(order.subtotal)} />
            {Number(order.discountTotal) ? (
              <Row
                term={order.couponCode ? `Discount (voucher ${order.couponCode})` : "Discount"}
                value={`− ${formatPKR(order.discountTotal)}`}
              />
            ) : null}
            <Row term="Delivery" value={Number(order.shippingTotal) ? formatPKR(order.shippingTotal) : "Free"} />
            {Number(order.codFee) ? <Row term="Cash on delivery fee" value={formatPKR(order.codFee)} /> : null}
            <div className="mt-1 flex justify-between border-t border-line pt-2 text-base font-extrabold">
              <dt>Total</dt>
              <dd>{formatPKR(order.grandTotal)}</dd>
            </div>
          </dl>
        </section>

        <aside className="grid content-start gap-4 text-sm">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-2 font-extrabold">Delivering to</h2>
            <p>
              {order.shipFullName}
              <br />
              {order.shipLine1}
              {order.shipLine2 ? (
                <>
                  <br />
                  {order.shipLine2}
                </>
              ) : null}
              <br />
              {order.shipCity}, {PROVINCES[order.shipProvince]}
              <br />
              {order.shipPhone}
            </p>
            {order.deliveryRateName ? <p className="mt-2 text-fg-muted">{order.deliveryRateName}</p> : null}
          </div>
          <div className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="mb-2 font-extrabold">Payment</h2>
            <p>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
            <p className="text-fg-muted">
              {PAYMENT_STATUS_LABELS[order.paymentStatus]} · {ORDER_STATUS_LABELS[order.status]}
            </p>
          </div>
          <p className="text-fg-muted">
            Keep this page&apos;s link to check your order later. A confirmation is sent to {order.email}.
          </p>
          <Link href="/products" className="btn-outline">
            Continue shopping
          </Link>
        </aside>
      </div>
    </>
  );
}

function Row({ term, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-fg-muted">{term}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
