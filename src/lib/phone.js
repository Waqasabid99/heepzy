/** Pakistani mobile numbers. Safe on client and server. */

/** Pakistani mobile → "03XXXXXXXXX", or null. Accepts +92 3XX…, 92…, 03…, with spaces/dashes. */
export function normalizePhone(v) {
  const digits = String(v ?? "").replace(/[\s-]/g, "");
  const m = digits.match(/^(?:\+?92|0)?(3\d{9})$/);
  return m ? `0${m[1]}` : null;
}

/**
 * Keep a phone box to a Pakistani mobile number while typing: digits only,
 * "0300 1234567" format, max 11 digits. A pasted "+92 300 1234567" becomes
 * "0300 1234567". Servers validate again with normalizePhone.
 */
export function formatPhone(raw) {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("92")) {
    d = d.slice(0, 12);
    if (d.length < 12) return `+${d}`;
    d = `0${d.slice(2)}`;
  } else if (d.startsWith("3")) d = `0${d}`;
  d = d.slice(0, 11);
  return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
}
