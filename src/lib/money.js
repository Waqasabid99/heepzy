/** Client-safe money helpers. Amounts arrive as strings ("1234.00") or numbers. */
const pkr = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatPKR(amount) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return Number.isFinite(n) ? pkr.format(n) : "";
}

/** Percentage off between compare-at price and selling price (0 when not on sale). */
export function percentOff(price, compareAt) {
  const p = Number(price);
  const c = Number(compareAt);
  if (!c || c <= p) return 0;
  return Math.round(((c - p) / c) * 100);
}
