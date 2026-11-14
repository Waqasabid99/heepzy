import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { formatPKR } from "@/lib/money";
import { uploadRoot } from "@/lib/uploads";

/** Shared pieces for the admin social image routes (products, vouchers, offers). */

export const THEMES = {
  sale: {
    bg: "#D3122A",
    fg: "#FFFFFF",
    muted: "rgba(255,255,255,0.78)",
    pillBg: "#FFB000",
    pillFg: "#111111",
    dot: "#FFB000",
  },
  new: {
    bg: "#111111",
    fg: "#FFFFFF",
    muted: "rgba(255,255,255,0.7)",
    pillBg: "#FFB000",
    pillFg: "#111111",
    dot: "#D3122A",
  },
  festive: {
    bg: "#0B7A55",
    fg: "#FFFFFF",
    muted: "rgba(255,255,255,0.78)",
    pillBg: "#E3C98B",
    pillFg: "#0A2C22",
    dot: "#E3C98B",
  },
};

let fontCache;
export async function loadFonts() {
  if (!fontCache) {
    const dir = path.join(/* turbopackIgnore: true */ process.cwd(), "assets/fonts");
    const [oswald, manrope500, manrope700] = await Promise.all(
      ["oswald-latin-600-normal.woff", "manrope-latin-500-normal.woff", "manrope-latin-700-normal.woff"].map((f) =>
        readFile(path.join(/* turbopackIgnore: true */ dir, f)),
      ),
    );
    fontCache = [
      { name: "Oswald", data: oswald, weight: 600, style: "normal" },
      { name: "Manrope", data: manrope500, weight: 500, style: "normal" },
      { name: "Manrope", data: manrope700, weight: 700, style: "normal" },
    ];
  }
  return fontCache;
}

/** Map a stored image URL to a file on disk (only our own folders). */
function imagePath(url) {
  if (/^\/images\/[A-Za-z0-9/_.-]+\.(jpe?g|png|webp)$/.test(url) && !url.includes("..")) {
    return path.join(/* turbopackIgnore: true */ process.cwd(), "public", url);
  }
  const m = url.match(/^\/media\/(products)\/([a-z0-9]{6,12}-[a-f0-9]{12}\.jpg)$/);
  if (m) return path.join(/* turbopackIgnore: true */ uploadRoot(), m[1], m[2]);
  return null;
}

/**
 * A product photo as a data URI for ImageResponse (null if unavailable).
 * fit "cover" crops to fill the box; fit "contain" shows the whole photo,
 * centred on a blurred, enlarged copy of itself so there are no empty bars.
 */
export async function photoDataUri(url, width, height, { fit = "cover" } = {}) {
  const file = url && imagePath(url);
  if (!file) return null;
  const w = Math.round(width);
  const h = Math.round(height);
  try {
    const input = await readFile(/* turbopackIgnore: true */ file);
    let out;
    if (fit === "contain") {
      const [backdrop, fg] = await Promise.all([
        sharp(input).resize(w, h, { fit: "cover" }).blur(40).modulate({ brightness: 0.9 }).toBuffer(),
        sharp(input).resize(w, h, { fit: "inside" }).toBuffer(),
      ]);
      out = await sharp(backdrop)
        .composite([{ input: fg, gravity: "center" }])
        .jpeg({ quality: 86 })
        .toBuffer();
    } else {
      out = await sharp(input)
        .resize(w, h, { fit: "cover", position: sharp.strategy.attention })
        .jpeg({ quality: 86 })
        .toBuffer();
    }
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Valid "#rrggbb" or null. */
export function cleanHex(v) {
  return /^#[0-9a-fA-F]{6}$/.test(String(v ?? "")) ? String(v).toUpperCase() : null;
}

/**
 * Colours for a post: a preset theme, or a custom background with
 * automatically chosen readable text and accent colours.
 */
export function themeFor(key, bgHex) {
  const bg = cleanHex(bgHex);
  if (!bg) return THEMES[key] ?? THEMES.sale;
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(bg.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const dark = luminance < 0.4;
  const saffronish = r > 0.8 && g > 0.55 && b < 0.4;
  return dark
    ? {
        bg,
        fg: "#FFFFFF",
        muted: "rgba(255,255,255,0.78)",
        pillBg: saffronish ? "#111111" : "#FFB000",
        pillFg: saffronish ? "#FFFFFF" : "#111111",
        dot: "#FFB000",
      }
    : {
        bg,
        fg: "#111111",
        muted: "rgba(17,17,17,0.7)",
        pillBg: "#D3122A",
        pillFg: "#FFFFFF",
        dot: "#D3122A",
      };
}

/** Store perks for the image footer. */
export function storePerks(settings) {
  return [
    settings.codEnabled ? "Cash on delivery" : null,
    settings.freeDeliveryEnabled && settings.freeDeliveryThreshold
      ? `Free delivery over ${formatPKR(settings.freeDeliveryThreshold)}`
      : "Delivery across Pakistan",
    settings.returnsEnabled ? `${settings.returnWindowDays}-day exchange` : null,
  ].filter(Boolean);
}

export function siteHost() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "") || "heepzy";
}

export const imageHeaders = { "Cache-Control": "private, no-store" };
