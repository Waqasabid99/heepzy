/**
 * WhatsApp message wording (safe on client and server, so the settings page
 * can preview). Placeholders are replaced per order; a line whose placeholder
 * has no value (e.g. no tracking number) is left out.
 */
export const MESSAGE_GROUPS = { orders: "Orders", returns: "Returns and refunds" };

export const MESSAGE_EVENTS = {
  ORDER_CONFIRMED: {
    group: "orders",
    label: "Order confirmed",
    hint: "When you confirm an order, or a card payment goes through.",
  },
  ORDER_SHIPPED: { group: "orders", label: "Order shipped", hint: "When you mark an order as shipped." },
  ORDER_DELIVERED: { group: "orders", label: "Order delivered", hint: "When you mark an order as delivered." },
  ORDER_CANCELLED: { group: "orders", label: "Order cancelled", hint: "When you cancel an order." },
  RETURN_APPROVED: {
    group: "returns",
    label: "Return approved",
    hint: "When you approve a return or exchange request.",
  },
  RETURN_REJECTED: {
    group: "returns",
    label: "Return rejected",
    hint: "When you reject a request (with your reason).",
  },
  RETURN_RECEIVED: { group: "returns", label: "Return received", hint: "When the shoes come back to you." },
  RETURN_COMPLETED: {
    group: "returns",
    label: "Return completed",
    hint: "When you complete an exchange (or a return without a refund).",
  },
  REFUND_SENT: { group: "returns", label: "Refund sent", hint: "When you record a refund, for a return or an order." },
};

export const PLACEHOLDERS = {
  name: "Customer's first name",
  store: "Your store name",
  store_link: "Your store's web address",
  order: "Order number",
  items: "What they ordered, one per line",
  total: "Order total",
  payment: "How they're paying",
  cod: "Cash to keep ready for the rider (empty if already paid)",
  courier: "Courier name",
  tracking: "Tracking number",
  link: "Private link to the order page",
  return_days: "Days to exchange or return",
  rma: "Return request number",
  resolution: "exchange or refund",
  note: "Your note or reason (empty if none)",
  refund_amount: "Amount refunded or to refund",
  refund_method: "How the refund was sent",
  reference: "Refund reference (empty if none)",
};

export const DEFAULT_TEMPLATES = {
  ORDER_CONFIRMED: `Assalam o Alaikum {name}!

Your {store} order *{order}* is confirmed.
{items}

Total: *{total}* ({payment})

We're packing it now and will message you when it's on its way.
Order details: {link}`,
  ORDER_SHIPPED: `Good news {name}! Your order *{order}* is on its way with {courier}.
Tracking number: {tracking}
Please keep *{cod}* cash ready for the rider.

Tip: record a short video while opening the parcel, in case anything is damaged.
Order details: {link}`,
  ORDER_DELIVERED: `Your {store} order *{order}* has been delivered. We hope you love your new pair!

Wrong size? You can exchange within {return_days} days from here: {link}

Thank you for shopping with {store}.`,
  ORDER_CANCELLED: `Assalam o Alaikum {name}. Your {store} order *{order}* has been cancelled.
Reason: {note}
You paid online, so we'll refund *{refund_amount}* and message you as soon as it's sent.

Sorry for the trouble. You're welcome back any time: {store_link}`,
  RETURN_APPROVED: `Assalam o Alaikum {name}! Your {resolution} request *{rma}* for order *{order}* is approved.
Note from us: {note}

Please pack the shoes unworn, in their box with all tags. We'll call or WhatsApp you to arrange the pickup.
Details: {link}`,
  RETURN_REJECTED: `Assalam o Alaikum {name}. We're sorry, we can't accept return request *{rma}* for order *{order}*.
Reason: {note}

If you have any questions, just reply to this message.`,
  RETURN_RECEIVED: `We've received your shoes for *{rma}* (order *{order}*). Thank you!
We'll complete your {resolution} now and let you know as soon as it's done.`,
  RETURN_COMPLETED: `Your {resolution} *{rma}* for order *{order}* is complete.
Note from us: {note}

Thank you for shopping with {store}!`,
  REFUND_SENT: `Assalam o Alaikum {name}, we've sent your refund of *{refund_amount}* for order *{order}* ({refund_method}).
Reference: {reference}

It can take a few working days to show in your account. Thank you for your patience.`,
};

/** Fill in a template. Lines that use a placeholder with no value are dropped. */
export function renderTemplate(body, values) {
  return String(body)
    .split("\n")
    .filter((line) => {
      const used = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((k) => k in PLACEHOLDERS);
      return used.every((k) => values[k] != null && String(values[k]).trim() !== "");
    })
    .map((line) => line.replace(/\{(\w+)\}/g, (m, k) => (k in PLACEHOLDERS ? String(values[k] ?? "") : m)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Example values for the settings preview. */
export const SAMPLE_VALUES = {
  name: "Ayesha",
  store: "Mr. Shoes",
  order: "HZ-26-4K9D2Q",
  items: "• Zari Khussa, Red, size 38 × 1\n• Court Classic, White, size 39 × 1",
  total: "Rs 11,480",
  payment: "cash on delivery",
  cod: "Rs 11,480",
  courier: "TCS",
  tracking: "7713 2290 451",
  link: "https://mrshoes.pk/checkout/complete/HZ-26-4K9D2Q?t=…",
  return_days: "7",
  store_link: "https://mrshoes.pk",
  rma: "RMA-26-K3D9QX",
  resolution: "exchange",
  note: "",
  refund_amount: "Rs 3,490",
  refund_method: "bank transfer",
  reference: "IBFT 4471 2290",
};

/** Example note per message for the settings preview. */
export const SAMPLE_NOTES = {
  ORDER_CANCELLED: "The size you chose has just sold out.",
  RETURN_APPROVED: "Our rider will come on Thursday between 2 and 6 pm.",
  RETURN_REJECTED: "The shoes have been worn outside, so we can't take them back.",
  RETURN_COMPLETED: "Your size 40 was sent today with TCS.",
};
