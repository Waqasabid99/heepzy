import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getStoreSettings } from "@/lib/settings";
import { formatPKR } from "@/lib/money";
import { uploadRoot } from "@/lib/uploads";
import { discountPercent, SOCIAL_FORMATS, SOCIAL_STYLES } from "@/lib/social";

/**
 * GET /admin/products/:id/social-image?format=square|story&style=sale|new|festive&image=0&headline=…
 * Renders a branded, ready-to-post PNG for Instagram / Facebook from the saved product.
 * Admin only.
 */

const THEMES = {
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
async function loadFonts() {
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

async function photoDataUri(url, width, height) {
  const file = url && imagePath(url);
  if (!file) return null;
  try {
    const buf = await sharp(await readFile(/* turbopackIgnore: true */ file))
      .resize(width, height, { fit: "cover", position: sharp.strategy.attention })
      .jpeg({ quality: 86 })
      .toBuffer();
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const sp = request.nextUrl.searchParams;
  const formatKey = SOCIAL_FORMATS[sp.get("format")] ? sp.get("format") : "square";
  const styleKey = SOCIAL_STYLES[sp.get("style")] ? sp.get("style") : "new";
  const imageIndex = Math.max(0, Math.min(Number.parseInt(sp.get("image") ?? "0", 10) || 0, 11));
  const headline = (sp.get("headline") ?? SOCIAL_STYLES[styleKey].headline).replace(/\s+/g, " ").trim().slice(0, 40);

  if (typeof id !== "string" || id.length > 40) return new Response("Not found", { status: 404 });
  const product = await db.product.findFirst({
    where: { id, deletedAt: null },
    select: {
      name: true,
      basePrice: true,
      compareAtPrice: true,
      images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
    },
  });
  if (!product) return new Response("Not found", { status: 404 });

  const settings = await getStoreSettings();
  const { width, height } = SOCIAL_FORMATS[formatKey];
  const story = formatKey === "story";
  const pad = story ? 80 : 60;
  const photoW = width - pad * 2;
  const photoH = story ? 1080 : 560;
  const theme = THEMES[styleKey];
  const price = Number(product.basePrice);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const off = discountPercent(price, compareAt);
  const photo = await photoDataUri(product.images[imageIndex]?.url ?? product.images[0]?.url, photoW * 2, photoH * 2);
  const host = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "") || "heepzy";
  const pill =
    styleKey === "sale" ? (off ? `SAVE ${off}%` : "SALE") : styleKey === "festive" ? "EID & SHAADI" : "NEW ARRIVAL";
  const nameSize = product.name.length > 24 ? (story ? 76 : 58) : story ? 96 : 72;
  const perks = [
    settings.codEnabled ? "Cash on delivery" : null,
    settings.freeDeliveryEnabled && settings.freeDeliveryThreshold
      ? `Free delivery over ${formatPKR(settings.freeDeliveryThreshold)}`
      : "Delivery across Pakistan",
    settings.returnsEnabled ? `${settings.returnWindowDays}-day exchange` : null,
  ].filter(Boolean);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: theme.bg,
        color: theme.fg,
        padding: pad,
        fontFamily: "Manrope",
      }}
    >
      {/* Header: wordmark + tag */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontFamily: "Oswald", fontSize: story ? 60 : 46, letterSpacing: 1 }}>
          HEEPZY<span style={{ color: theme.dot }}>.</span>
        </div>
        <div
          style={{
            display: "flex",
            background: theme.pillBg,
            color: theme.pillFg,
            fontWeight: 700,
            fontSize: story ? 30 : 24,
            letterSpacing: 2,
            padding: story ? "14px 28px" : "10px 22px",
            borderRadius: 999,
          }}
        >
          {pill}
        </div>
      </div>

      {/* Photo */}
      <div
        style={{
          display: "flex",
          marginTop: story ? 48 : 28,
          width: photoW,
          height: photoH,
          borderRadius: 28,
          overflow: "hidden",
          background: "rgba(255,255,255,0.12)",
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- Satori (ImageResponse) needs a plain <img>
          <img src={photo} width={photoW} height={photoH} style={{ objectFit: "cover" }} alt="" />
        ) : null}
      </div>

      {/* Text */}
      <div style={{ display: "flex", flexDirection: "column", marginTop: story ? 52 : 26, flexGrow: 1 }}>
        {headline ? (
          <div
            style={{
              display: "flex",
              fontWeight: 700,
              fontSize: story ? 30 : 22,
              letterSpacing: 4,
              color: theme.muted,
              textTransform: "uppercase",
            }}
          >
            {headline}
          </div>
        ) : null}
        <div
          style={{
            display: "flex",
            fontFamily: "Oswald",
            fontSize: nameSize,
            lineHeight: 1.02,
            textTransform: "uppercase",
            marginTop: 6,
          }}
        >
          {product.name}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", marginTop: story ? 22 : 12 }}>
          <div style={{ display: "flex", fontFamily: "Oswald", fontSize: story ? 84 : 60 }}>{formatPKR(price)}</div>
          {off ? (
            <div
              style={{
                display: "flex",
                marginLeft: 22,
                fontSize: story ? 40 : 30,
                color: theme.muted,
                textDecoration: "line-through",
              }}
            >
              {formatPKR(compareAt)}
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          // Stories are narrow for their text size: stack perks over the site address.
          flexDirection: story ? "column" : "row",
          justifyContent: "space-between",
          alignItems: story ? "flex-start" : "center",
          gap: story ? 10 : 0,
          borderTop: `2px solid ${theme.muted}`,
          paddingTop: story ? 28 : 18,
          fontSize: story ? 28 : 21,
          fontWeight: 700,
        }}
      >
        <div style={{ display: "flex", color: theme.muted }}>{perks.join("  ·  ")}</div>
        <div style={{ display: "flex" }}>{host}</div>
      </div>
    </div>,
    {
      width,
      height,
      fonts: await loadFonts(),
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
