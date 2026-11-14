const ORDER = {
  PENDING: ["Placed", "bg-info-bg text-info"],
  CONFIRMED: ["Confirmed", "bg-warning-bg text-warning"],
  PROCESSING: ["Packing", "bg-warning-bg text-warning"],
  SHIPPED: ["Shipped", "bg-info-bg text-info"],
  DELIVERED: ["Delivered", "bg-success-bg text-success"],
  CANCELLED: ["Cancelled", "bg-muted text-fg-muted"],
  RETURNED: ["Returned", "bg-muted text-fg-muted"],
};
const PAYMENT = {
  UNPAID: ["Unpaid", "bg-muted text-fg-muted"],
  PENDING: ["Awaiting payment", "bg-warning-bg text-warning"],
  PAID: ["Paid", "bg-success-bg text-success"],
  FAILED: ["Failed", "bg-danger-bg text-sale"],
  PARTIALLY_REFUNDED: ["Part refunded", "bg-muted text-fg-muted"],
  REFUNDED: ["Refunded", "bg-muted text-fg-muted"],
};

const pill = "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap";

export function OrderStatusBadge({ status }) {
  const [text, cls] = ORDER[status] ?? [status, "bg-muted"];
  return <span className={`${pill} ${cls}`}>{text}</span>;
}

export function PaymentBadge({ method, status }) {
  const [text, cls] = PAYMENT[status] ?? [status, "bg-muted"];
  return (
    <span className="flex flex-col items-start gap-1">
      <span className={`${pill} ${cls}`}>{text}</span>
      <span className="text-xs text-fg-muted">{method === "COD" ? "Cash on delivery" : "Card (Safepay)"}</span>
    </span>
  );
}
