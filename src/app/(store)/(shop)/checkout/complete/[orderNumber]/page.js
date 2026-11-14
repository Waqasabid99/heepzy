import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderForViewer, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/orders";
import { PROVINCES } from "@/lib/checkout";
import { formatPKR } from "@/lib/money";
import { RetryPayment } from "@/components/store/retry-payment";
import { AlertCircle, Check, Clock, Exchange, Truck, Video } from "@/components/ui/icons";
import { getStoreSettings } from "@/lib/settings";
import {
  openReturnQuantities,
  RESOLUTION_LABELS,
  RETURN_STATUS_LABELS,
  returnEligibility,
  returnsForOrder,
} from "@/lib/returns";
import { CancelReturnButton } from "@/components/store/cancel-return-button";

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

  const [settings, openQty, returns] = await Promise.all([
    getStoreSettings(),
    openReturnQuantities(order.id),
    returnsForOrder(order.id),
  ]);
  const returnCheck = returnEligibility(order, settings, openQty);
  const returnHref = `/returns/new?order=${order.orderNumber}${token ? `&t=${encodeURIComponent(token)}` : ""}`;
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
  } else if (order.status === "DELIVERED" || order.status === "RETURNED") {
    Icon = Check;
    title = order.status === "RETURNED" ? "Returned" : "Delivered";
    text =
      order.status === "RETURNED"
        ? "This order has been returned."
        : returnCheck.eligible
          ? "We hope you love your new shoes. Wrong size? You can request an exchange below."
          : "We hope you love your new shoes.";
  } else if (order.status === "SHIPPED") {
    tone = "info";
    Icon = Truck;
    title = "On its way";
    text = order.courier
      ? `Sent with ${order.courier}${order.trackingNumber ? ` (tracking ${order.trackingNumber})` : ""}. ${order.paymentMethod === "COD" && !paid ? "Keep the cash ready for the rider." : ""}`
      : "Your order has left our store.";
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
          {returnCheck.eligible ? (
            <Link href={returnHref} className="btn-outline mt-5">
              <Exchange className="size-4" /> Return or exchange
            </Link>
          ) : null}
        </div>
      </div>

      {settings.returnsEnabled && ["CONFIRMED", "PROCESSING", "SHIPPED"].includes(order.status) ? (
        <p className="mt-6 flex items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm">
          <Video className="mt-0.5 size-5 shrink-0 text-brand" />
          <span>
            <span className="font-bold">Record an unboxing video</span> when your parcel arrives. If a shoe is damaged
            or not what you ordered, you can add the video and photos to a return request.
          </span>
        </p>
      ) : null}

      {sp.return ? (
        <p
          role="status"
          className="mt-6 flex items-center gap-2 rounded-xl bg-success-bg p-4 text-sm font-semibold text-success"
        >
          <Check className="size-4 shrink-0" /> Return request {String(sp.return).slice(0, 20)} sent. We&apos;ll contact
          you to arrange the pickup.
        </p>
      ) : null}

      {returns.length ? (
        <section
          id="returns"
          aria-labelledby="returns-title"
          className="mt-6 rounded-2xl border border-line bg-surface p-5 sm:p-6"
        >
          <h2 id="returns-title" className="mb-3 text-lg font-extrabold">
            Returns
          </h2>
          <ul className="grid gap-3 text-sm">
            {returns.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-muted p-4">
                <span>
                  <span className="font-bold">{r.rmaNumber}</span> · {RESOLUTION_LABELS[r.resolution]}
                  <span className="block text-fg-muted">
                    {r.items.map((i) => `${i.orderItem.productName} (${i.orderItem.size}) × ${i.quantity}`).join(", ")}
                  </span>
                  {r.refunded ? <span className="block">Refunded {formatPKR(r.refunded)}</span> : null}
                </span>
                <span className="flex items-center gap-3">
                  <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold">
                    {RETURN_STATUS_LABELS[r.status]}
                  </span>
                  {r.status === "REQUESTED" ? (
                    <CancelReturnButton orderNumber={order.orderNumber} token={token} returnId={r.id} />
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
            Keep this page&apos;s link to check your order later.
            {order.email ? ` A confirmation is sent to ${order.email}.` : ""}
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
