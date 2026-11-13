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
