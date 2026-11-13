"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPKR } from "@/lib/money";

/**
 * Gallery-style product card (borderless, studio image on a soft ground).
 *  - Hovering the image cross-fades to the next view of the shoe.
 *  - Thumbnails under the image: one per colourway when there are several,
 *    otherwise one per view. Hover/focus/click swaps the main image.
 */
export function ProductCard({
  product,
  priority = false,
  className = "",
  sizes = "(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 92vw",
}) {
  const { slug, name, subtitle, price, compareAt, badge, colours, images = [], soldOut } = product;
  const href = `/products/${slug}`;

  // Build the thumbnail set: [{ label, main, next }]
  const byColour = colours.length > 1;
  const thumbs = byColour
    ? colours.map((c) => {
        const shots = images.filter((i) => i.color === c.name);
        return { label: c.name, main: shots[0] ?? images[0], next: shots[1] ?? null };
      })
    : images
        .slice(0, 4)
        .map((img, i, arr) => ({ label: `View ${i + 1}`, main: img, next: arr[(i + 1) % arr.length] ?? null }));
  const [active, setActive] = useState(0);
  const current = thumbs[active] ?? { main: product.image, next: null };
  const hasSwap = current.next && current.next.url !== current.main?.url;

  const discount = compareAt ? Math.round(((compareAt - price) / compareAt) * 100) : 0;
  const labels = [
    badge === "New" ? { text: "New", cls: "bg-emerald text-emerald-fg" } : null,
    discount ? { text: `−${discount}%`, cls: "bg-accent text-accent-fg" } : null,
    soldOut ? { text: "Sold out", cls: "bg-surface text-fg" } : null,
  ].filter(Boolean);

  return (
    <article className={`flex flex-col ${className}`}>
      {/* Image link is a duplicate of the title link, so it's hidden from AT and the tab order. */}
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="group/img relative block aspect-square overflow-hidden bg-muted"
      >
        {current.main ? (
          <Image
            src={current.main.url}
            alt=""
            fill
            sizes={sizes}
            priority={priority}
            className={`object-cover transition-[opacity,transform] duration-700 ease-out-soft group-hover/img:scale-[1.03] ${
              hasSwap ? "group-hover/img:opacity-0" : ""
            }`}
          />
        ) : null}
        {hasSwap ? (
          <Image
            src={current.next.url}
            alt=""
            fill
            sizes={sizes}
            className="scale-[1.03] object-cover opacity-0 transition-[opacity,transform] duration-700 ease-out-soft group-hover/img:scale-100 group-hover/img:opacity-100"
          />
        ) : null}

        {labels.length ? (
          <span className="absolute top-3 left-3 flex flex-col items-start gap-1">
            {labels.map((l) => (
              <span key={l.text} className={`px-2.5 py-1 text-[11px] font-bold tracking-wide ${l.cls}`}>
                {l.text}
              </span>
            ))}
          </span>
        ) : null}
      </Link>

      {thumbs.length > 1 ? (
        <ul className="mt-2.5 flex gap-1.5" aria-label={byColour ? "Colours" : "Views"}>
          {thumbs.map((t, i) => (
            <li key={t.label}>
              <button
                type="button"
                aria-label={byColour ? `Show ${t.label}` : `Show ${t.label.toLowerCase()} of ${name}`}
                aria-pressed={i === active}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                className="relative block size-12 overflow-hidden bg-muted outline-offset-2 transition-shadow aria-pressed:shadow-[0_0_0_1.5px_var(--hz-fg)]"
              >
                {t.main ? <Image src={t.main.url} alt="" fill sizes="48px" className="object-cover" /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex flex-col gap-1">
        <h3 className="text-[13px] leading-snug font-bold tracking-[0.06em] uppercase">
          <Link href={href} className="hover:underline hover:underline-offset-4">
            {name}
          </Link>
        </h3>
        <p className="text-[13px] text-fg-muted">{subtitle}</p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[15px] font-bold">
          {compareAt ? (
            <s className="text-[13px] font-semibold text-sale">
              <span className="sr-only">Was </span>
              {formatPKR(compareAt)}
            </s>
          ) : null}
          <span className={compareAt ? "text-success" : ""}>
            {compareAt ? <span className="sr-only">Now </span> : null}
            {formatPKR(price)}
          </span>
          {discount ? <span className="text-xs font-bold text-brand">Save {discount}%</span> : null}
        </p>
      </div>
    </article>
  );
}
