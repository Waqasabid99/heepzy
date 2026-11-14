/**
 * Pakistan time (UTC+5, no daylight saving) helpers for <input type="datetime-local">.
 * Admins enter and read times in PKT whatever their device's time zone is.
 * Safe on client and server.
 */
const OFFSET_MS = 5 * 60 * 60 * 1000;

/** Date | ISO string | null → "YYYY-MM-DDTHH:mm" in PKT, or "". */
export function toPktInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 16);
}

/** "YYYY-MM-DDTHH:mm" (PKT) → Date, or null for "" / invalid input. */
export function fromPktInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(value ?? ""))) return null;
  const d = new Date(`${value}:00+05:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const pktDateTime = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Karachi",
});

export const pktDate = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Karachi",
});
