import Image from "next/image";
import Link from "next/link";
import { formatPKR } from "@/lib/money";

/** Card from the design: rounded tile, image on muted ground, Oswald price. */
export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 92vw",
}) {
  const { slug, name, subtitle, price, compareAt, badge, image, colours, soldOut } = product;
  return (
    <article className="group relative flex flex-col gap-4 rounded-card border border-line bg-surface p-3">
      <div className="relative aspect-[5/4] overflow-hidden rounded-[18px] bg-muted">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
          />
        ) : null}
        {badge ? (
          <span
            className={`absolute top-3 left-3 rounded-full px-3 py-1 text-[11px] font-bold ${compareAt ? "bg-sale text-white" : "bg-fg text-bg"}`}
          >
            {badge}
          </span>
        ) : null}
        {soldOut ? (
          <span className="absolute right-3 bottom-3 rounded-full bg-surface px-3 py-1 text-[11px] font-bold">
            Sold out
          </span>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-3 px-1.5">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold">
            {/* Stretched link: the whole card is clickable, one tab stop. */}
            <Link href={`/products/${slug}`} className="after:absolute after:inset-0 after:rounded-card">
              {name}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-[13px] text-fg-muted">{subtitle}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`font-display text-xl font-medium ${compareAt ? "text-sale" : ""}`}>{formatPKR(price)}</p>
          {compareAt ? (
            <p className="text-xs text-fg-muted">
              <span className="sr-only">Was </span>
              <s>{formatPKR(compareAt)}</s>
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-1.5 pb-1.5">
        <ul className="flex gap-1.5" aria-label={`${colours.length} ${colours.length === 1 ? "colour" : "colours"}`}>
          {colours.map((c) => (
            <li
              key={c.name}
              title={c.name}
              className="size-3.5 rounded-full border border-line"
              style={{ background: c.hex || "transparent" }}
            />
          ))}
        </ul>
        <span aria-hidden="true" className="text-[13px] font-bold underline-offset-4 group-hover:underline">
          View details
        </span>
      </div>
    </article>
  );
}
