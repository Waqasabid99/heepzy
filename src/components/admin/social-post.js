"use client";

import { useId, useRef, useState } from "react";
import { buildCaption, SOCIAL_FORMATS, SOCIAL_STYLES } from "@/lib/social";
import { Check, Close, ExternalLink, Sparkle, Upload } from "@/components/ui/icons";

/** Preset post colours: brand, festive and wedding-season favourites. */
const SWATCHES = [
  ["#D3122A", "Crimson"],
  ["#7A0E1E", "Maroon"],
  ["#F2A900", "Saffron"],
  ["#0B7A55", "Emerald"],
  ["#1D3F8F", "Royal blue"],
  ["#111111", "Black"],
  ["#F6D6D9", "Blush pink"],
  ["#F4EDE1", "Ivory"],
];

/**
 * "Create social post" for a product: a branded image (see
 * /admin/products/[id]/social-image) plus a ready caption.
 */
export function SocialPost({ productId, summary, images, settings, productUrl, dirty }) {
  const firstStyle = summary.compareAt ? "sale" : "new";
  return (
    <SocialPostDialog
      title="Social media post"
      subtitle={`For Instagram and Facebook. Uses the saved product${dirty ? " (save your changes first to include them)" : ""}.`}
      disabled={!images.length}
      disabledHint="Add a photo first."
      styles={SOCIAL_STYLES}
      defaultStyle={firstStyle}
      photos={images.map((img, i) => ({ url: img.url, name: `Photo ${i + 1}` }))}
      imageSrc={(q) => `/admin/products/${productId}/social-image?${q}`}
      caption={({ style, platform }) => buildCaption({ product: summary, settings, style, platform, url: productUrl })}
      shareUrl={productUrl}
      fileBase={summary.slug}
      previewName={summary.name}
      styleHint={(style) =>
        style === "sale" && !summary.compareAt
          ? "Tip: set an original price on the product to show the discount."
          : null
      }
    />
  );
}

/**
 * Generic social post dialog: live image preview with size / look / photo /
 * headline controls, an editable caption per platform, and download, copy
 * and share actions. Used for products, vouchers and offers.
 *
 * - styles: { key: { label, headline } }
 * - photos: [{ url, name }]; `allowNoPhoto` adds a "No photo" choice (image=-1)
 * - imageSrc(queryString) → image URL; caption({ style, platform }) → text
 */
export function SocialPostDialog({
  title,
  subtitle,
  disabled = false,
  disabledHint,
  styles,
  defaultStyle,
  photos,
  allowNoPhoto = false,
  imageSrc,
  caption: makeCaption,
  shareUrl,
  fileBase,
  previewName,
  styleHint,
}) {
  const uid = useId();
  const dialogRef = useRef(null);
  const [format, setFormat] = useState("square");
  const [style, setStyle] = useState(defaultStyle);
  const [imageIndex, setImageIndex] = useState(photos.length ? 0 : -1);
  // null = the style's own colour; otherwise a "#rrggbb" background.
  const [color, setColor] = useState(null);
  // The native picker fires on every drag; re-render the image once the admin pauses.
  const colorTimer = useRef(null);
  const pickCustom = (value) => {
    clearTimeout(colorTimer.current);
    colorTimer.current = setTimeout(() => {
      setColor(value.toUpperCase());
    }, 400);
  };
  // `headline` drives the image; `draft` is what's being typed (applied on blur / Enter).
  const [headline, setHeadline] = useState(styles[defaultStyle].headline);
  const [draft, setDraft] = useState(headline);
  const [platform, setPlatform] = useState("instagram");
  const [captionEdit, setCaptionEdit] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  // Which image URL has finished loading / failed. "Loading" is derived, so it can never get stuck.
  const [loadedSrc, setLoadedSrc] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);
  // Only render (and fetch) the preview while the dialog is open.
  const [open, setOpen] = useState(false);

  const caption = captionEdit ?? makeCaption({ style, platform });
  const params = new URLSearchParams({ format, style, image: String(imageIndex), headline });
  if (color) params.set("color", color);
  const src = imageSrc(params.toString());
  const loaded = loadedSrc === src;
  const failed = failedSrc === src;
  const fileName = `${fileBase}-${format}-${style}.png`;

  const say = (text) => {
    setNotice(text);
    setTimeout(() => setNotice((n) => (n === text ? null : n)), 4000);
  };
  const pickStyle = (s) => {
    setStyle(s);
    setHeadline(styles[s].headline);
    setDraft(styles[s].headline);
  };
  async function getBlob() {
    const res = await fetch(src);
    if (!res.ok) throw new Error("render failed");
    return res.blob();
  }
  async function download() {
    setBusy(true);
    try {
      const url = URL.createObjectURL(await getBlob());
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      say("Image downloaded.");
    } catch {
      say("Couldn't create the image. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      say("Caption copied.");
    } catch {
      say("Couldn't copy. Select the caption and copy it manually.");
    }
  }
  async function share() {
    setBusy(true);
    try {
      const file = new File([await getBlob()], fileName, { type: "image/png" });
      // Instagram drops shared text, so put the caption on the clipboard first.
      await navigator.clipboard?.writeText(caption).catch(() => {});
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
        say("Shared. The caption is also copied, paste it if the app didn't keep it.");
      } else {
        say("Sharing files isn't supported in this browser. Download the image instead (caption copied).");
      }
    } catch (e) {
      if (e?.name !== "AbortError") say("Sharing was cancelled or failed.");
    } finally {
      setBusy(false);
    }
  }

  const radio =
    "flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-[13px] font-semibold has-checked:border-fg has-checked:bg-fg has-checked:text-bg has-focus-visible:outline-2 has-focus-visible:outline-ring";
  const label = "mb-1.5 block text-[13px] font-bold";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          dialogRef.current?.showModal();
        }}
        disabled={disabled}
        className="btn-outline min-h-11 w-full"
      >
        <Sparkle className="size-4" /> Create social post
      </button>
      {disabled && disabledHint ? <p className="mt-2 text-[13px] text-fg-muted">{disabledHint}</p> : null}

      <dialog
        ref={dialogRef}
        aria-labelledby={`${uid}-title`}
        className="modal bg-surface text-fg"
        style={{ width: "min(72rem, calc(100vw - 2rem))" }}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id={`${uid}-title`} className="font-display text-2xl font-semibold uppercase">
              {title}
            </h2>
            <p className="text-[13px] text-fg-muted">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="btn-icon border-0"
          >
            <Close />
          </button>
        </div>

        <div className="grid max-h-[75dvh] gap-6 overflow-y-auto px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* Preview */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative w-full overflow-hidden rounded-xl bg-muted"
              style={{
                aspectRatio: `${SOCIAL_FORMATS[format].width} / ${SOCIAL_FORMATS[format].height}`,
                maxWidth: format === "story" ? 300 : 520,
              }}
            >
              {open ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- generated PNG, not an optimisable asset */}
                  <img
                    key={src}
                    src={src}
                    alt={`Preview of the ${SOCIAL_FORMATS[format].label.toLowerCase()} for ${previewName}`}
                    onLoad={() => setLoadedSrc(src)}
                    onError={() => setFailedSrc(src)}
                    className={`size-full object-contain transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
                  />
                </>
              ) : null}
              {!loaded ? (
                <p role="status" className="absolute inset-0 grid place-items-center text-sm text-fg-muted">
                  {failed ? "Couldn't create the image. Try another option." : "Creating image…"}
                </p>
              ) : null}
            </div>
            <p className="text-xs text-fg-muted">
              {SOCIAL_FORMATS[format].width} × {SOCIAL_FORMATS[format].height} px PNG
            </p>
          </div>

          {/* Controls */}
          <div className="grid content-start gap-5">
            <fieldset>
              <legend className={label}>Size</legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SOCIAL_FORMATS).map(([key, f]) => (
                  <label key={key} className={radio}>
                    <input
                      type="radio"
                      name={`${uid}-format`}
                      className="sr-only"
                      checked={format === key}
                      onChange={() => {
                        setFormat(key);
                      }}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className={label}>Style</legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(styles).map(([key, s]) => (
                  <label key={key} className={radio}>
                    <input
                      type="radio"
                      name={`${uid}-style`}
                      className="sr-only"
                      checked={style === key}
                      onChange={() => pickStyle(key)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
              {styleHint?.(style) ? <p className="mt-1.5 text-[13px] text-fg-muted">{styleHint(style)}</p> : null}
            </fieldset>

            <fieldset>
              <legend className={label}>Colour</legend>
              <div className="flex flex-wrap items-center gap-2">
                <label className={radio}>
                  <input
                    type="radio"
                    name={`${uid}-color`}
                    className="sr-only"
                    checked={color === null}
                    onChange={() => {
                      setColor(null);
                    }}
                  />
                  Style colour
                </label>
                {SWATCHES.map(([hex, name]) => (
                  <label
                    key={hex}
                    title={name}
                    className="grid size-10 cursor-pointer place-items-center rounded-full border-2 border-line has-checked:border-fg has-focus-visible:outline-2 has-focus-visible:outline-ring"
                  >
                    <input
                      type="radio"
                      name={`${uid}-color`}
                      className="sr-only"
                      checked={color === hex}
                      onChange={() => {
                        setColor(hex);
                      }}
                    />
                    <span className="sr-only">{name}</span>
                    <span aria-hidden="true" className="size-7 rounded-full" style={{ background: hex }} />
                  </label>
                ))}
                <label className={`${radio} gap-2`}>
                  <span
                    aria-hidden="true"
                    className="size-5 rounded-full border border-line"
                    style={{ background: color ?? "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}
                  />
                  Custom
                  <input
                    type="color"
                    value={color ?? "#D3122A"}
                    onChange={(e) => pickCustom(e.target.value)}
                    className="sr-only"
                    aria-label="Custom colour"
                  />
                </label>
              </div>
            </fieldset>

            {photos.length > 1 || (allowNoPhoto && photos.length) ? (
              <fieldset>
                <legend className={label}>Photo</legend>
                <div className="flex flex-wrap gap-2">
                  {photos.map((img, i) => (
                    <label
                      key={img.url}
                      title={img.name}
                      className="relative size-16 cursor-pointer overflow-hidden border-2 border-transparent bg-muted has-checked:border-accent has-focus-visible:outline-2 has-focus-visible:outline-ring"
                    >
                      <input
                        type="radio"
                        name={`${uid}-img`}
                        className="sr-only"
                        checked={imageIndex === i}
                        onChange={() => {
                          setImageIndex(i);
                        }}
                      />
                      <span className="sr-only">{img.name}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element -- tiny thumbnail */}
                      <img src={img.url} alt="" className="size-full object-cover" />
                    </label>
                  ))}
                  {allowNoPhoto ? (
                    <label className="grid size-16 cursor-pointer place-items-center border-2 border-line bg-muted text-center text-[11px] font-bold has-checked:border-accent has-focus-visible:outline-2 has-focus-visible:outline-ring">
                      <input
                        type="radio"
                        name={`${uid}-img`}
                        className="sr-only"
                        checked={imageIndex === -1}
                        onChange={() => {
                          setImageIndex(-1);
                        }}
                      />
                      No photo
                    </label>
                  ) : null}
                </div>
              </fieldset>
            ) : null}

            <div>
              <label htmlFor={`${uid}-headline`} className={label}>
                Headline on the image
              </label>
              <input
                id={`${uid}-headline`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                  if (draft !== headline) {
                    setHeadline(draft);
                  }
                }}
                onKeyDown={(e) => {
                  // Inside the product form: Enter applies the headline instead of saving the product.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                maxLength={40}
                className="min-h-11 w-full rounded-xl border border-field bg-surface px-3.5 text-sm"
              />
            </div>

            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor={`${uid}-caption`} className="text-[13px] font-bold">
                  Caption
                </label>
                <div role="group" aria-label="Caption for" className="flex gap-1.5">
                  {[
                    ["instagram", "Instagram"],
                    ["facebook", "Facebook"],
                  ].map(([key, text]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={platform === key}
                      onClick={() => {
                        setPlatform(key);
                        setCaptionEdit(null);
                      }}
                      className="min-h-9 rounded-full border border-line px-3.5 text-xs font-bold aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-bg"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                id={`${uid}-caption`}
                value={caption}
                onChange={(e) => setCaptionEdit(e.target.value)}
                rows={12}
                className="w-full rounded-xl border border-field bg-surface px-3.5 py-2.5 text-sm leading-relaxed"
              />
              {captionEdit != null ? (
                <button
                  type="button"
                  onClick={() => setCaptionEdit(null)}
                  className="mt-1 min-h-9 text-[13px] font-bold underline underline-offset-4"
                >
                  Reset to the automatic caption
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
          <p role="status" className="flex min-h-5 items-center gap-1.5 text-[13px] font-semibold text-success">
            {notice ? (
              <>
                <Check className="size-4" /> {notice}
              </>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyCaption} className="btn-ghost min-h-11 border border-line">
              Copy caption
            </button>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost min-h-11 border border-line"
            >
              Share link on Facebook <ExternalLink className="size-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <button type="button" onClick={share} disabled={busy} className="btn-outline min-h-11">
              <Upload className="size-4" /> Share
            </button>
            <button type="button" onClick={download} disabled={busy} className="btn-ink min-h-11">
              {busy ? "Working…" : "Download image"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
