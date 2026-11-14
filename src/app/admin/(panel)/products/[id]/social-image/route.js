import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isStaff } from "@/lib/roles";
import { getStoreSettings } from "@/lib/settings";
import { formatPKR } from "@/lib/money";
import { loadPromotions, priceFor } from "@/lib/pricing";
import { imageHeaders, loadFonts, photoDataUri, storePerks, themeFor } from "@/lib/social-render";
import { fitSize, PostFooter, PostHeader, PostPhoto, readPromoParams } from "@/lib/social-promo-image";
import { discountPercent, SOCIAL_FORMATS, SOCIAL_STYLES } from "@/lib/social";

/**
 * GET /admin/products/:id/social-image?format=square|story&style=sale|new|festive&image=0&headline=…&color=%23rrggbb
 * Ready-to-post PNG for Instagram / Facebook from the saved product, priced
 * like the store (a running offer wins). Admin only.
 */
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  if (typeof id !== "string" || id.length > 40) return new Response("Not found", { status: 404 });

  const p = readPromoParams(request.nextUrl.searchParams, SOCIAL_STYLES);
  const [product, settings, promos] = await Promise.all([
    db.product.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        brandId: true,
        basePrice: true,
        compareAtPrice: true,
        categories: { select: { id: true } },
        images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
      },
    }),
    getStoreSettings(),
    loadPromotions(),
  ]);
  if (!product) return new Response("Not found", { status: 404 });

  const live = priceFor(
    promos.list,
    { id: product.id, brandId: product.brandId, categoryIds: product.categories.map((c) => c.id) },
    product.basePrice,
    product.compareAtPrice,
  );
  const { price, compareAt } = live;
  const off = discountPercent(price, compareAt);

  const { width, height } = SOCIAL_FORMATS[p.format];
  const story = p.format === "story";
  const theme = themeFor(p.style, p.color);
  const pad = story ? 80 : 60;
  const inner = width - pad * 2;
  const photoUrl = product.images[Math.max(0, p.image)]?.url ?? product.images[0]?.url;
  const photoW = inner;
  const photoH = story ? 1080 : 560;
  // Square: show the whole photo (blurred fill around it); stories have room to crop nicely.
  const photo = await photoDataUri(photoUrl, photoW * 2, photoH * 2, { fit: story ? "cover" : "contain" });
  const textW = inner;
  const pill =
    p.style === "sale" ? (off ? `SAVE ${off}%` : "SALE") : p.style === "festive" ? "EID & SHAADI" : "NEW ARRIVAL";
  const nameSize = fitSize(product.name, textW * 1.8, story ? 96 : 72, 0.5);
  const priceSize = story ? 84 : 60;

  const text = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: textW,
        flexGrow: 1,
        marginTop: story ? 52 : 26,
      }}
    >
      {p.headline ? (
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
          {p.headline}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          fontFamily: "Oswald",
          fontSize: nameSize,
          lineHeight: 1.04,
          textTransform: "uppercase",
          marginTop: 8,
        }}
      >
        {product.name}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginTop: story ? 22 : 12,
        }}
      >
        <div style={{ display: "flex", fontFamily: "Oswald", fontSize: priceSize }}>{formatPKR(price)}</div>
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
        {live.promotion ? (
          <div
            style={{
              display: "flex",
              marginLeft: 22,
              border: `3px solid ${theme.fg}`,
              borderRadius: 999,
              padding: story ? "10px 24px" : "8px 18px",
              fontSize: story ? 28 : 20,
              fontWeight: 700,
            }}
          >
            {live.promotion.name.slice(0, 24)}
          </div>
        ) : null}
      </div>
    </div>
  );

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
      <PostHeader theme={theme} pill={pill} story={story} />
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <PostPhoto src={photo} width={photoW} height={photoH} marginTop={story ? 48 : 28} />
        {text}
      </div>
      <PostFooter theme={theme} perks={storePerks(settings)} story={story} />
    </div>,
    { width, height, fonts: await loadFonts(), headers: imageHeaders },
  );
}
