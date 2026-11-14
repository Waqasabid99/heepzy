/** WhatsApp helpers (safe on client and server). */

/** "03001234567" → "923001234567" (the format wa.me wants), or null. */
export function waNumber(phone) {
  const d = String(phone ?? "").replace(/\D/g, "");
  if (/^03\d{9}$/.test(d)) return `92${d.slice(1)}`;
  if (/^923\d{9}$/.test(d)) return d;
  return null;
}

/** Link that opens a chat with the message typed in, ready to send (WhatsApp app or WhatsApp Web). */
export function waLink(phone, text = "") {
  const n = waNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
