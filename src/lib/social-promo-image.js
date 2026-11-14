import "server-only";
import { ImageResponse } from "next/og";
import { getStoreSettings } from "@/lib/settings";
import { SOCIAL_FORMATS } from "@/lib/social";
import { cleanHex, imageHeaders, loadFonts, photoDataUri, siteHost, storePerks, themeFor } from "@/lib/social-render";

/** Header row: wordmark + pill. Shared by every social image. */
export function PostHeader({ theme, pill, story }) {
  return (
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
  );
}

/** Footer: store perks + site address. Stories stack them (narrow for the text size). */
export function PostFooter({ theme, perks, story }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: story ? "column" : "row",
        justifyContent: "space-between",
        alignItems: story ? "flex-start" : "center",
        gap: story ? 10 : 0,
        borderTop: `2px solid ${theme.muted}`,
        paddingTop: story ? 28 : 16,
        fontSize: story ? 28 : 20,
        fontWeight: 700,
      }}
    >
      <div style={{ display: "flex", color: theme.muted }}>{perks.join("  ·  ")}</div>
      <div style={{ display: "flex" }}>{siteHost()}</div>
    </div>
  );
}

/** Photo panel (or nothing). */
export function PostPhoto({ src, width, height, marginTop = 0 }) {
  if (!src) return null;
  return (
    <div
      style={{
        display: "flex",
        flexShrink: 0,
        marginTop,
        width,
        height,
        borderRadius: 28,
        overflow: "hidden",
        background: "rgba(255,255,255,0.12)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori (ImageResponse) needs a plain <img> */}
      <img src={src} width={width} height={height} style={{ objectFit: "cover" }} alt="" />
    </div>
  );
}

/** Font size so `text` (Oswald caps, ~0.5em per character) fits in `width`, capped at `max`. */
export const fitSize = (text, width, max, perChar = 0.5) =>
  Math.floor(Math.min(max, width / Math.max(1, String(text).length * perChar)));

/**
 * Branded voucher / offer image for Instagram & Facebook.
 *  - amount: "10% OFF" (the hero)
 *  - code: voucher code in a dashed "coupon" box (vouchers only)
 *  - title: offer name (offers only)
 *  - terms: short conditions
 * Square: whole photo on the left, text on the right. Story: photo on top.
 */
export async function promoImageResponse({
  format,
  theme: themeKey,
  color,
  pill,
  headline,
  amount,
  code,
  title,
  terms,
  photoUrl,
}) {
  const settings = await getStoreSettings();
  const { width, height } = SOCIAL_FORMATS[format];
  const story = format === "story";
  const theme = themeFor(themeKey, color);
  const pad = story ? 80 : 60;
  const perks = storePerks(settings);

  // Layout boxes
  const inner = width - pad * 2;
  const photoW = inner;
  const photoH = story ? 760 : 400;
  const photo = photoUrl
    ? // Square: show the whole photo (blurred fill around it); stories have room to crop nicely.
      await photoDataUri(photoUrl, photoW * 2, photoH * 2, { fit: story ? "cover" : "contain" })
    : null;
  const textW2 = inner;

  const amountSize = fitSize(amount, textW2, story ? 168 : photo ? 112 : 170, 0.52);
  const codeSize = code ? fitSize(code, textW2 - 60, story ? 84 : 60, 0.6) : 0;
  const titleSize = title ? fitSize(title, textW2, story ? 80 : 56, 0.5) : 0;

  const text = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: photo ? "flex-start" : "center",
        width: textW2,
        flexGrow: 1,
        marginTop: photo ? (story ? 48 : 22) : 0,
      }}
    >
      {headline ? (
        <div
          style={{
            display: "flex",
            fontWeight: 700,
            fontSize: story ? 32 : 22,
            letterSpacing: 4,
            color: theme.muted,
            textTransform: "uppercase",
          }}
        >
          {headline}
        </div>
      ) : null}
      {title ? (
        <div
          style={{
            display: "flex",
            fontFamily: "Oswald",
            fontSize: titleSize,
            lineHeight: 1.05,
            textTransform: "uppercase",
            marginTop: 6,
          }}
        >
          {title}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          fontFamily: "Oswald",
          fontSize: amountSize,
          lineHeight: 1,
          textTransform: "uppercase",
          marginTop: story ? 10 : 6,
        }}
      >
        {amount}
      </div>

      {code ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            alignSelf: "flex-start",
            marginTop: story ? 34 : 24,
            border: `4px dashed ${theme.fg}`,
            borderRadius: 20,
            padding: story ? "18px 34px" : "10px 24px",
            background: "rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontWeight: 700,
              fontSize: story ? 28 : 18,
              letterSpacing: 3,
              color: theme.muted,
              marginRight: story ? 28 : 20,
            }}
          >
            USE CODE
          </div>
          <div style={{ display: "flex", fontFamily: "Oswald", fontSize: codeSize, letterSpacing: 3 }}>{code}</div>
        </div>
      ) : null}

      {terms.length ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            marginTop: story ? 30 : 18,
            fontSize: story ? 30 : 21,
            fontWeight: 700,
            color: theme.muted,
          }}
        >
          {terms.join("  ·  ")}
        </div>
      ) : null}
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
        <PostPhoto src={photo} width={photoW} height={photoH} marginTop={story ? 48 : 26} />
        {text}
      </div>
      <PostFooter theme={theme} perks={perks} story={story} />
    </div>,
    { width, height, fonts: await loadFonts(), headers: imageHeaders },
  );
}

/** Parse the shared query string for social images. `color` is an optional "#rrggbb" background. */
export function readPromoParams(sp, styles, defaultHeadline) {
  const format = SOCIAL_FORMATS[sp.get("format")] ? sp.get("format") : "square";
  const style = styles[sp.get("style")] ? sp.get("style") : Object.keys(styles)[0];
  const image = Math.max(-1, Math.min(Number.parseInt(sp.get("image") ?? "0", 10) || 0, 11));
  const raw = sp.get("headline");
  const headline = (raw ?? defaultHeadline ?? styles[style].headline).replace(/\s+/g, " ").trim().slice(0, 40);
  return { format, style, image, headline, color: cleanHex(sp.get("color")) };
}
