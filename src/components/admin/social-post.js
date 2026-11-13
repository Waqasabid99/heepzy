"use client";

import { useId, useRef, useState } from "react";
import { buildCaption, SOCIAL_FORMATS, SOCIAL_STYLES } from "@/lib/social";
import { Check, Close, ExternalLink, Sparkle, Upload } from "@/components/ui/icons";

/**
 * "Create social post": renders a branded image (see
 * /admin/products/[id]/social-image) plus a ready caption, with download,
 * copy and share actions for Instagram / Facebook.
 */
export function SocialPost({ productId, summary, images, settings, productUrl, dirty }) {
  const uid = useId();
  const dialogRef = useRef(null);
  const [format, setFormat] = useState("square");
  const [style, setStyle] = useState(summary.compareAt ? "sale" : "new");
  const [imageIndex, setImageIndex] = useState(0);
  // `headline` drives the image; `draft` is what's being typed (applied on blur / Enter).
  const [headline, setHeadline] = useState(SOCIAL_STYLES[summary.compareAt ? "sale" : "new"].headline);
  const [draft, setDraft] = useState(headline);
  const [platform, setPlatform] = useState("instagram");
  const [captionEdit, setCaptionEdit] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Only render (and fetch) the preview while the dialog is open.
  const [open, setOpen] = useState(false);

  const autoCaption = buildCaption({ product: summary, settings, style, platform, url: productUrl });
  const caption = captionEdit ?? autoCaption;
  const params = new URLSearchParams({ format, style, image: String(imageIndex), headline });
  const src = `/admin/products/${productId}/social-image?${params}`;
  const fileName = `${summary.slug}-${format}-${style}.png`;

  const say = (text) => {
    setNotice(text);
    setTimeout(() => setNotice((n) => (n === text ? null : n)), 4000);
  };
  const pickStyle = (s) => {
    setStyle(s);
    setHeadline(SOCIAL_STYLES[s].headline);
    setDraft(SOCIAL_STYLES[s].headline);
    setLoaded(false);
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
          setLoaded(false);
          setOpen(true);
          dialogRef.current?.showModal();
        }}
        disabled={!images.length}
        className="btn-outline min-h-11 w-full"
      >
        <Sparkle className="size-4" /> Create social post
      </button>
      {!images.length ? <p className="mt-2 text-[13px] text-fg-muted">Add a photo first.</p> : null}

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
              Social media post
            </h2>
            <p className="text-[13px] text-fg-muted">
              For Instagram and Facebook. Uses the saved product
              {dirty ? " (save your changes first to include them)" : ""}.
            </p>
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
                    alt={`Preview of the ${SOCIAL_FORMATS[format].label.toLowerCase()} for ${summary.name}`}
                    onLoad={() => setLoaded(true)}
                    className={`size-full object-contain transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
                  />
                </>
              ) : null}
              {!loaded ? (
                <p role="status" className="absolute inset-0 grid place-items-center text-sm text-fg-muted">
                  Creating image…
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
                        setLoaded(false);
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
                {Object.entries(SOCIAL_STYLES).map(([key, s]) => (
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
              {style === "sale" && !summary.compareAt ? (
                <p className="mt-1.5 text-[13px] text-fg-muted">
                  Tip: set an original price on the product to show the discount.
                </p>
              ) : null}
            </fieldset>

            {images.length > 1 ? (
              <fieldset>
                <legend className={label}>Photo</legend>
                <div className="flex flex-wrap gap-2">
                  {images.map((img, i) => (
                    <label
                      key={img.url}
                      className="relative size-16 cursor-pointer overflow-hidden border-2 border-transparent bg-muted has-checked:border-accent has-focus-visible:outline-2 has-focus-visible:outline-ring"
                    >
                      <input
                        type="radio"
                        name={`${uid}-img`}
                        className="sr-only"
                        checked={imageIndex === i}
                        onChange={() => {
                          setImageIndex(i);
                          setLoaded(false);
                        }}
                      />
                      <span className="sr-only">Photo {i + 1}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element -- tiny thumbnail */}
                      <img src={img.url} alt="" className="size-full object-cover" />
                    </label>
                  ))}
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
                    setLoaded(false);
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
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`}
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
