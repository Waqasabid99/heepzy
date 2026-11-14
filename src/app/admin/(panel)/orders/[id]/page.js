import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Notice } from "@/components/admin/ui";
import { CustomerLink } from "@/components/admin/customer-link";
import { OrderRefund } from "@/components/admin/return-actions";
import { ReturnStatusBadge } from "@/components/admin/return-badge";
import { REFUND_METHOD_LABELS, RESOLUTION_LABELS, refundable } from "@/lib/returns";
import { OrderStatusBadge, PaymentBadge } from "@/components/admin/order-badges";
import { OrderActions } from "@/components/admin/order-actions";
import { SendMessageDialog } from "@/components/admin/send-message-dialog";
import { MessageCard } from "@/components/admin/message-card";
import { MessageHistory } from "@/components/admin/message-history";
import { orderMessages } from "@/lib/admin/messages";
import { getAdminOrder, NEXT_STATUSES } from "@/lib/admin/orders";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import { PROVINCES } from "@/lib/checkout";
import { formatPKR } from "@/lib/money";

export const metadata = { title: "Order" };

const dateFmt = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Karachi",
});
const PROVIDER = { COD: "Cash on delivery", SAFEPAY: "Safepay", MANUAL: "Paid offline" };
const PAYMENT_STATUS = {
  INITIATED: "Started",
  PENDING: "Waiting",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export default withAdmin(async function OrderPage({ params, searchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const order = await getAdminOrder(id);
  if (!order) notFound();
  const messages = await orderMessages(order.id);
  const waiting = messages.filter((m) => m.status === "PENDING").reverse();
  const handled = messages.filter((m) => m.status !== "PENDING");
  const needsPayment = order.paymentMethod === "CARD" && order.paymentStatus !== "PAID" && order.status === "PENDING";
  const canRefund = ["PAID", "PARTIALLY_REFUNDED"].includes(order.paymentStatus);
  // Kept mounted once fully refunded so the refund's WhatsApp dialog can still show.
  const showRefund = canRefund || order.paymentStatus === "REFUNDED";
  const waPhone = order.shipPhone.replace(/^0/, "92");

  return (
    <AdminPage
      title={order.orderNumber}
      description={`Placed ${dateFmt.format(new Date(order.placedAt))}`}
      back={{ href: "/admin/orders", label: "Orders" }}
      actions={
        <>
          <OrderStatusBadge status={order.status} />
          <PaymentBadge method={order.paymentMethod} status={order.paymentStatus} />
        </>
      }
    >
      {sp.created && messages.some((m) => m.status === "PENDING") ? (
        <SendMessageDialog
          result={{ message: "Order created.", whatsapp: messages.find((m) => m.status === "PENDING") }}
        />
      ) : null}
      {sp.created ? (
        <Notice>
          Order created and stock reserved.
          {order.paymentMethod === "CARD" ? " Send the customer the payment link below." : ""}
        </Notice>
      ) : null}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-5">
          <section aria-labelledby="items-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 id="items-title" className="mb-4 font-extrabold">
              Items
            </h2>
            <ul className="grid gap-4">
              {order.items.map((it) => (
                <li key={it.id} className="flex gap-3">
                  <span className="relative size-16 shrink-0 bg-muted">
                    {it.imageUrl ? <Image src={it.imageUrl} alt="" fill sizes="64px" className="object-cover" /> : null}
                  </span>
                  <span className="flex-1 text-sm">
                    {it.product?.id ? (
                      <Link href={`/admin/products/${it.product.id}`} className="font-bold hover:underline">
                        {it.productName}
                      </Link>
                    ) : (
                      <span className="font-bold">{it.productName}</span>
                    )}
                    <span className="block text-fg-muted">
                      {it.color} · Size {it.size} · <span className="font-mono text-xs">{it.sku}</span>
                    </span>
                    <span className="block text-fg-muted">
                      {formatPKR(it.unitPrice)} × {it.quantity}
                    </span>
                  </span>
                  <span className="text-sm font-bold">{formatPKR(it.lineTotal)}</span>
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
              <Row
                term={`Delivery${order.deliveryRateName ? ` · ${order.deliveryRateName}` : ""}`}
                value={Number(order.shippingTotal) ? formatPKR(order.shippingTotal) : "Free"}
              />
              {Number(order.codFee) ? <Row term="COD fee" value={formatPKR(order.codFee)} /> : null}
              {Number(order.taxTotal) ? <Row term="GST (included)" value={formatPKR(order.taxTotal)} /> : null}
              <div className="mt-1 flex justify-between border-t border-line pt-2 text-base font-extrabold">
                <dt>Total</dt>
                <dd>{formatPKR(order.grandTotal)}</dd>
              </div>
            </dl>
          </section>

          <div className="grid gap-5 md:grid-cols-2">
            <section aria-labelledby="cust-title" className="rounded-2xl border border-line bg-surface p-5 text-sm">
              <h2 id="cust-title" className="mb-2 font-extrabold">
                Customer
              </h2>
              <p className="font-semibold">{order.shipFullName}</p>
              <p>
                {order.email ? (
                  <a href={`mailto:${order.email}`} className="hover:underline">
                    {order.email}
                  </a>
                ) : (
                  <span className="text-fg-muted">No email</span>
                )}
              </p>
              <p className="flex flex-wrap gap-x-3">
                <a href={`tel:${order.phone}`} className="hover:underline">
                  {order.phone}
                </a>
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-success hover:underline"
                >
                  WhatsApp<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
              <p className="mt-2 text-fg-muted">
                {order.user ? "Registered customer" : "Guest checkout"} ·{" "}
                {order.previousOrders
                  ? `${order.previousOrders} other ${order.previousOrders === 1 ? "order" : "orders"}`
                  : "First order"}
              </p>
            </section>
            <section aria-labelledby="ship-title" className="rounded-2xl border border-line bg-surface p-5 text-sm">
              <h2 id="ship-title" className="mb-2 font-extrabold">
                Delivery address
              </h2>
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
                {order.shipPostalCode ? ` ${order.shipPostalCode}` : ""}
                <br />
                {order.shipPhone}
              </p>
              {order.courier ? (
                <p className="mt-2 font-semibold">
                  {order.courier}
                  {order.trackingNumber ? ` · ${order.trackingNumber}` : ""}
                </p>
              ) : null}
            </section>
          </div>

          {order.customerNote ? (
            <section className="rounded-2xl border border-warning/40 bg-warning-bg p-5 text-sm text-warning">
              <h2 className="mb-1 font-extrabold">Customer note</h2>
              <p>{order.customerNote}</p>
            </section>
          ) : null}

          <section aria-labelledby="pay-title" className="rounded-2xl border border-line bg-surface p-5 text-sm">
            <h2 id="pay-title" className="mb-3 font-extrabold">
              Payments
            </h2>
            <ul className="grid gap-2">
              {order.payments.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2"
                >
                  <span>
                    <span className="font-semibold">{PROVIDER[p.provider] ?? p.provider}</span> ·{" "}
                    {PAYMENT_STATUS[p.status] ?? p.status}
                    {p.providerState ? ` (${p.providerState})` : ""}
                    {p.providerPaymentId ? (
                      <span className="block font-mono text-xs text-fg-muted">{p.providerPaymentId}</span>
                    ) : null}
                    {p.failureReason ? <span className="block text-xs text-sale">{p.failureReason}</span> : null}
                  </span>
                  <span className="font-bold">{formatPKR(p.amount)}</span>
                </li>
              ))}
            </ul>
          </section>

          {order.refunds.length || order.returnRequests.length ? (
            <section aria-labelledby="ref-title" className="rounded-2xl border border-line bg-surface p-5 text-sm">
              <h2 id="ref-title" className="mb-3 font-extrabold">
                Returns and refunds
              </h2>
              <ul className="grid gap-2">
                {order.returnRequests.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2"
                  >
                    <Link href={`/admin/returns/${r.id}`} className="font-semibold hover:underline">
                      {r.rmaNumber} · {RESOLUTION_LABELS[r.resolution]}
                    </Link>
                    <ReturnStatusBadge status={r.status} />
                  </li>
                ))}
                {order.refunds.map((f) => (
                  <li
                    key={f.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2"
                  >
                    <span>
                      Refund · {REFUND_METHOD_LABELS[f.method]}
                      {f.reason ? <span className="block text-xs text-fg-muted">{f.reason}</span> : null}
                    </span>
                    <span className="font-bold">− {formatPKR(f.amount)}</span>
                  </li>
                ))}
              </ul>
              {Number(order.refundedTotal) ? (
                <p className="mt-3 font-semibold">Refunded in total: {formatPKR(order.refundedTotal)}</p>
              ) : null}
            </section>
          ) : null}

          <section aria-labelledby="hist-title" className="rounded-2xl border border-line bg-surface p-5 text-sm">
            <h2 id="hist-title" className="mb-3 font-extrabold">
              Timeline
            </h2>
            <ol className="grid gap-3 border-l-2 border-line pl-4">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="relative">
                  <span aria-hidden="true" className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-fg" />
                  <span className="font-semibold">{ORDER_STATUS_LABELS[h.status]}</span>
                  <span className="text-fg-muted">
                    {" "}
                    · {dateFmt.format(new Date(h.createdAt))} · {h.actor}
                  </span>
                  {h.note ? <span className="block text-fg-muted">{h.note}</span> : null}
                </li>
              ))}
            </ol>
          </section>

          {handled.length ? (
            <section aria-labelledby="msgs-title" className="rounded-2xl border border-line bg-surface p-5 text-sm">
              <h2 id="msgs-title" className="mb-3 font-extrabold">
                WhatsApp messages
              </h2>
              <MessageHistory messages={handled} />
            </section>
          ) : null}

          {(order.status !== "CANCELLED" && !needsPayment) || showRefund ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {order.status !== "CANCELLED" && !needsPayment ? (
                <CustomerLink orderId={order.id} orderNumber={order.orderNumber} phone={order.phone} />
              ) : null}
              {showRefund ? (
                <OrderRefund
                  orderId={order.id}
                  max={refundable(order)}
                  defaultMethod={order.paymentMethod === "CARD" ? "ORIGINAL_PAYMENT" : "BANK_TRANSFER"}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        <aside className="grid content-start gap-4">
          <OrderActions
            order={{
              id: order.id,
              status: order.status,
              paymentMethod: order.paymentMethod,
              paymentStatus: order.paymentStatus,
              adminNote: order.adminNote,
            }}
            next={NEXT_STATUSES[order.status] ?? []}
          >
            {waiting.map((m) => (
              <MessageCard key={m.id} message={m} showOrder={false} />
            ))}
          </OrderActions>
          {needsPayment ? (
            <CustomerLink orderId={order.id} orderNumber={order.orderNumber} phone={order.phone} needsPayment />
          ) : null}
        </aside>
      </div>
    </AdminPage>
  );
});

function Row({ term, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-fg-muted">{term}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
