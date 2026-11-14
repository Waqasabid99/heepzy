const STYLES = {
  active: "bg-success-bg text-success",
  scheduled: "bg-info-bg text-info",
  ended: "bg-muted text-fg-muted",
  usedUp: "bg-warning-bg text-warning",
  off: "bg-muted text-fg-muted",
};
const LABELS = { active: "Active", scheduled: "Scheduled", ended: "Ended", usedUp: "Used up", off: "Off" };

/** Badge for voucher / offer lifecycle states. */
export function StateBadge({ state }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${STYLES[state] ?? "bg-muted"}`}>
      {LABELS[state] ?? state}
    </span>
  );
}
