const STYLES = {
  REQUESTED: "bg-warning-bg text-warning",
  APPROVED: "bg-info-bg text-info",
  IN_TRANSIT: "bg-info-bg text-info",
  RECEIVED: "bg-info-bg text-info",
  COMPLETED: "bg-success-bg text-success",
  REJECTED: "bg-muted text-fg-muted",
  CANCELLED: "bg-muted text-fg-muted",
};
const LABELS = {
  REQUESTED: "New",
  APPROVED: "Approved",
  IN_TRANSIT: "On its way",
  RECEIVED: "Received",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export function ReturnStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${STYLES[status] ?? "bg-muted"}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
