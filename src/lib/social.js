import { formatPKR } from "@/lib/money";

/**
 * Social post helpers shared by the admin dialog (client) and the image
 * route (server). Pure functions — no DB access here.
 */
export const SOCIAL_FORMATS = {
  square: { width: 1080, height: 1080, label: "Square post (Instagram & Facebook feed)" },
  story: { width: 1080, height: 1920, label: "Story (Instagram & Facebook Stories)" },
};

export const SOCIAL_STYLES = {
  sale: { label: "Sale", headline: "Mega Sale" },
  new: { label: "New arrival", headline: "Just landed" },
  festive: { label: "Festive (Eid & Shaadi)", headline: "Eid & Shaadi Edit" },
};

const CATEGORY_TAGS = {
  khussa: ["Khussa", "KhussaPakistan", "PakistaniFashion"],
  heels: ["Heels", "PartyHeels", "WomensFashion"],
  sneakers: ["Sneakers", "SneakersPakistan", "StreetStyle"],
  formal: ["FormalShoes", "MensFashion", "LeatherShoes"],
  boots: ["Boots", "WinterStyle"],
  canvas: ["CanvasShoes", "EverydayStyle"],
};
const GENDER_TAGS = { WOMEN: "WomensShoes", MEN: "MensShoes", KIDS: "KidsShoes", UNISEX: "Shoes" };
const STYLE_TAGS = {
  sale: ["Sale", "SalePakistan"],
  new: ["NewArrivals"],
  festive: ["EidCollection", "ShaadiSeason", "WeddingShoes"],
};

export function discountPercent(price, compareAt) {
  return compareAt && compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
}

/**
 * Ready-to-post caption. Instagram doesn't make links clickable, so it
 * points to the bio/DMs; Facebook gets the product URL.
 */
export function buildCaption({ product, settings, style, platform, url }) {
  const { name, price, compareAt, shortDescription, colours = [], sizes = [], categorySlugs = [], gender } = product;
  const off = discountPercent(price, compareAt);
  const lines = [];

  if (style === "sale" && off) {
    lines.push(`SALE: ${name} is now ${formatPKR(price)} (was ${formatPKR(compareAt)}). Save ${off}%.`);
  } else if (style === "festive") {
    lines.push(`Made for mehndi, baraat and Eid: ${name}.`);
  } else if (style === "new") {
    lines.push(`New in: ${name}.`);
  } else {
    lines.push(name);
  }
  if (product.offer) {
    const ends = product.offer.endsAt ? ` Ends ${formatEnds(product.offer.endsAt)}.` : "";
    lines.push("", `Part of our ${product.offer.name}.${ends}`);
  }
  if (shortDescription) lines.push("", shortDescription);

  lines.push("");
  lines.push(off ? `Price: ${formatPKR(price)} (was ${formatPKR(compareAt)})` : `Price: ${formatPKR(price)}`);
  if (colours.length) lines.push(`${colours.length > 1 ? "Colours" : "Colour"}: ${colours.join(", ")}`);
  if (sizes.length) lines.push(`Sizes in stock (EU): ${sizes.join(", ")}`);

  const perks = [];
  if (settings?.codEnabled) perks.push("Cash on delivery all over Pakistan");
  if (settings?.freeDeliveryEnabled && settings?.freeDeliveryThreshold) {
    perks.push(`free delivery over ${formatPKR(settings.freeDeliveryThreshold)}`);
  }
  if (settings?.returnsEnabled) perks.push(`${settings.returnWindowDays}-day size exchange`);
  if (perks.length) {
    const sentence = perks.join(", ");
    lines.push("", `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`);
  }

  lines.push("");
  lines.push(platform === "instagram" ? "Order now: tap the link in our bio or send us a DM." : `Order now: ${url}`);

  const tags = new Set(["Heepzy", "HeepzyShoes"]);
  for (const slug of categorySlugs) for (const t of CATEGORY_TAGS[slug] ?? []) tags.add(t);
  if (GENDER_TAGS[gender]) tags.add(GENDER_TAGS[gender]);
  for (const t of STYLE_TAGS[style] ?? []) tags.add(t);
  for (const t of ["ShoesPakistan", "OnlineShoppingPakistan"]) tags.add(t);
  lines.push("", [...tags].map((t) => `#${t}`).join(" "));

  return lines.join("\n");
}

// ─── Vouchers & offers ─────────────────────────────────────────

/** Looks for voucher / offer posts. `theme` picks the colours in the image route. */
export const PROMO_STYLES = {
  sale: { label: "Sale", headline: "Limited time", theme: "sale" },
  festive: { label: "Festive (Eid & Shaadi)", headline: "Eid special", theme: "festive" },
  bold: { label: "Bold black", headline: "Exclusive deal", theme: "new" },
};

const endsFmt = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Karachi",
});
const endsShortFmt = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });
export const formatEnds = (iso, short = false) => (iso ? (short ? endsShortFmt : endsFmt).format(new Date(iso)) : null);

/** "10% OFF", "RS 500 OFF", "FREE DELIVERY". */
export function promoAmount({ type, value }) {
  const v = Number(value);
  if (type === "FREE_SHIPPING") return "Free delivery";
  return type === "PERCENTAGE" ? `${v}% off` : `${formatPKR(v)} off`;
}

/** One-line conditions for a voucher, e.g. "Min spend Rs 2,000 · Khussa & Chappals · Ends 20 Nov". */
export function voucherTerms(v, { short = false } = {}) {
  return [
    v.type === "PERCENTAGE" && v.maxDiscountAmount ? `Up to ${formatPKR(v.maxDiscountAmount)} off` : null,
    v.minOrderAmount ? `Min spend ${formatPKR(v.minOrderAmount)}` : null,
    v.scopeText && v.scopeText !== "Everything" ? v.scopeText : null,
    v.firstOrderOnly ? "First order only" : null,
    v.endsAt ? `Ends ${formatEnds(v.endsAt, short)}` : null,
  ].filter(Boolean);
}

function perkSentence(settings) {
  const perks = [];
  if (settings?.codEnabled) perks.push("Cash on delivery all over Pakistan");
  if (settings?.freeDeliveryEnabled && settings?.freeDeliveryThreshold) {
    perks.push(`free delivery over ${formatPKR(settings.freeDeliveryThreshold)}`);
  }
  if (settings?.returnsEnabled) perks.push(`${settings.returnWindowDays}-day size exchange`);
  if (!perks.length) return null;
  const s = perks.join(", ");
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
}

function promoTags(style, categorySlugs = [], extra = []) {
  const tags = new Set(["Heepzy", "HeepzyShoes", ...extra]);
  for (const slug of categorySlugs) for (const t of CATEGORY_TAGS[slug] ?? []) tags.add(t);
  for (const t of style === "festive" ? STYLE_TAGS.festive : STYLE_TAGS.sale) tags.add(t);
  for (const t of ["ShoesPakistan", "OnlineShoppingPakistan"]) tags.add(t);
  return [...tags].map((t) => `#${t}`).join(" ");
}

/** Caption for a voucher post. `voucher` = { code, type, value, maxDiscountAmount, minOrderAmount, endsAt, firstOrderOnly, usageLimit, description, scopeText, categorySlugs }. */
export function buildVoucherCaption({ voucher: v, settings, style, platform, url }) {
  const amount = promoAmount(v);
  const where = v.scopeText && v.scopeText !== "Everything" ? ` on ${v.scopeText}` : " on everything";
  const lines = [
    style === "festive"
      ? `Eid treat for you: use code ${v.code} for ${amount.toLowerCase()}${where}.`
      : `Use code ${v.code} for ${amount.toLowerCase()}${where}.`,
  ];
  if (v.description) lines.push("", v.description);
  lines.push("", `Code: ${v.code}`);
  for (const t of voucherTerms(v)) lines.push(t);
  if (v.usageLimit) lines.push(`Only for the first ${v.usageLimit} orders.`);
  lines.push("Enter the code at checkout.");
  const perks = perkSentence(settings);
  if (perks) lines.push("", perks);
  lines.push("", platform === "instagram" ? "Shop now: tap the link in our bio." : `Shop now: ${url}`);
  lines.push("", promoTags(style, v.categorySlugs, ["PromoCode", "DiscountCode"]));
  return lines.join("\n");
}

/** Caption for an offer post. `offer` = { name, type, value, description, endsAt, scopeText, categorySlugs }. */
export function buildOfferCaption({ offer: o, settings, style, platform, url }) {
  const amount = promoAmount(o).toLowerCase();
  const where = o.scopeText && o.scopeText !== "Everything" ? ` ${o.scopeText}` : " everything";
  const lines = [`${o.name} is live: ${amount}${where}. No code needed.`];
  if (o.description) lines.push("", o.description);
  if (o.endsAt) lines.push("", `Ends ${formatEnds(o.endsAt)}. Sizes go fast.`);
  const perks = perkSentence(settings);
  if (perks) lines.push("", perks);
  lines.push("", platform === "instagram" ? "Shop the sale: tap the link in our bio." : `Shop the sale: ${url}`);
  lines.push("", promoTags(style, o.categorySlugs));
  return lines.join("\n");
}
