"use client";

import { useActionState, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { addToCart } from "@/actions/cart";
import { formatPKR } from "@/lib/money";

/**
 * Product buy box (Ndure-style): colour as photo swatches, a joined EU/UK
 * size grid (sold-out sizes struck through), size guide in a popup, and a
 * full-width ADD TO BAG. Quantity is changed in the cart.
 */
export function BuyBox({ product, price = null }) {
  const colours = [...new Map(product.variants.map((v) => [v.color, v.colorHex])).entries()].map(([name, hex]) => ({
    name,
    hex,
    image: product.images.find((i) => i.color === name) ?? product.images[0] ?? null,
  }));
  const [colour, setColour] = useState(colours[0]?.name ?? null);
  const [size, setSize] = useState(null);
  const [state, action, pending] = useActionState(addToCart, null);
  const chartRef = useRef(null);

  const ukFor = Object.fromEntries((product.sizeChart?.entries ?? []).map((e) => [e.eu, e.uk]));
  const variants = product.variants.filter((v) => v.color === colour);
  const selected = variants.find((v) => v.size === size) ?? null;
  const baseSku = variants[0]?.sku.replace(/-[^-]+$/, "");

  let stockNote = null;
  if (selected)
    stockNote =
      selected.stock <= 3 ? `Only ${selected.stock} left in this size` : "In stock — dispatched within 24 hours";

  return (
    <form action={action} className="flex flex-col gap-4 short:gap-3">
      <input type="hidden" name="variantId" value={selected?.id ?? ""} />
      <input type="hidden" name="quantity" value="1" />

      <p className="-mt-2 text-[13px] tracking-[0.08em] text-fg-muted uppercase">
        {selected
          ? `${selected.sku} : ${colour} : ${selected.size}`
          : `${baseSku ?? ""}${colour ? ` : ${colour}` : ""}`}
      </p>

      {price}

      {/* Colour */}
      <fieldset>
        <div className="mb-2 flex items-center justify-between gap-3">
          <legend className="text-sm">
            Colour <strong className="ml-1.5 tracking-[0.06em] uppercase">{colour}</strong>
          </legend>
          {product.sizeChart ? (
            <button
              type="button"
              onClick={() => chartRef.current?.showModal()}
              aria-haspopup="dialog"
              className="min-h-8 text-[13px] font-bold tracking-[0.08em] uppercase underline underline-offset-4"
            >
              Size guide
            </button>
          ) : null}
        </div>
        <div className="flex gap-2">
          {colours.map((c) => (
            <label
              key={c.name}
              className="relative size-12 cursor-pointer overflow-hidden border border-line bg-muted has-checked:border-fg has-checked:shadow-[0_0_0_1px_var(--hz-fg)] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring short:size-10"
            >
              <input
                type="radio"
                name="colour"
                value={c.name}
                checked={colour === c.name}
                onChange={() => {
                  setColour(c.name);
                  setSize(null);
                }}
                className="sr-only"
              />
              <span className="sr-only">{c.name}</span>
              {c.image ? (
                <Image src={c.image.url} alt="" fill sizes="48px" className="object-cover" />
              ) : (
                <span
                  aria-hidden="true"
                  className="absolute inset-2 rounded-full"
                  style={{ background: c.hex || "transparent" }}
                />
              )}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Size */}
      <fieldset>
        <legend className="mb-2 text-sm">
          Size{" "}
          {size ? (
            <strong className="ml-1.5">
              EU {size}
              {ukFor[size] ? ` / UK ${ukFor[size]}` : ""}
            </strong>
          ) : null}
        </legend>
        <div className="grid grid-cols-4 border-t border-l border-line">
          {variants.map((v) => {
            const out = v.stock <= 0;
            const uk = ukFor[v.size];
            return (
              <label
                key={v.id}
                className={`grid min-h-11 place-items-center border-r border-b border-line text-sm tracking-[0.06em] transition-colors has-checked:bg-fg has-checked:text-bg has-focus-visible:outline-2 has-focus-visible:-outline-offset-4 has-focus-visible:outline-ring short:min-h-9 ${
                  out ? "cursor-not-allowed text-fg-muted/70 line-through" : "cursor-pointer hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name="size"
                  value={v.size}
                  disabled={out}
                  checked={size === v.size}
                  onChange={() => setSize(v.size)}
                  className="sr-only"
                />
                <span aria-hidden="true">{uk ? `${v.size}/${uk}` : v.size}</span>
                <span className="sr-only">
                  EU {v.size}
                  {uk ? `, UK ${uk}` : ""}
                  {out ? ", sold out" : ""}
                </span>
              </label>
            );
          })}
        </div>
        <p
          className={`mt-1.5 min-h-5 text-[13px] font-semibold ${selected && selected.stock <= 3 ? "text-sale" : "text-success"}`}
        >
          {stockNote}
        </p>
      </fieldset>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={pending || !selected}
          aria-describedby="cart-status"
          className="btn min-h-13 w-full rounded-none bg-fg text-[15px] font-semibold tracking-[0.14em] text-bg uppercase hover:opacity-90 disabled:bg-fg/80 disabled:opacity-100 short:min-h-12"
        >
          {pending ? "Adding…" : selected ? "Add to bag" : "Select a size"}
        </button>
        <p
          id="cart-status"
          role="status"
          className={`min-h-5 text-[13px] font-semibold ${state?.ok === false ? "text-sale" : ""}`}
        >
          {state?.message}{" "}
          {state?.ok ? (
            <Link href="/cart" className="link-underline">
              View bag
            </Link>
          ) : null}
        </p>
      </div>

      {/* Size guide popup (native modal dialog) */}
      {product.sizeChart ? (
        <dialog
          ref={chartRef}
          aria-labelledby="size-guide-title"
          className="modal bg-surface text-fg"
          onClick={(e) => {
            if (e.target === e.currentTarget) chartRef.current?.close();
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5 sm:px-8">
            <div>
              <h2 id="size-guide-title" className="heading text-3xl">
                Size guide
              </h2>
              <p className="mt-1 text-sm text-fg-muted">{product.sizeChart.name}</p>
            </div>
            <button
              type="button"
              onClick={() => chartRef.current?.close()}
              aria-label="Close size guide"
              className="btn-icon border-0"
            >
              <svg
                aria-hidden="true"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          </div>
          <div className="max-h-[70dvh] overflow-y-auto px-6 py-6 sm:px-8">
            {product.sizeChart.description ? (
              <p className="mb-5 text-sm text-fg-muted">{product.sizeChart.description}</p>
            ) : null}
            <div className="overflow-x-auto rounded-control border border-line">
              <table className="w-full border-collapse text-center text-sm">
                <caption className="sr-only">{product.sizeChart.name} size conversions</caption>
                <thead className="bg-muted">
                  <tr>
                    <th scope="col" className="p-3 font-semibold">
                      EU
                    </th>
                    <th scope="col" className="p-3 font-semibold">
                      UK
                    </th>
                    <th scope="col" className="p-3 font-semibold">
                      US
                    </th>
                    <th scope="col" className="p-3 font-semibold">
                      Foot length (cm)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {product.sizeChart.entries.map((r) => (
                    <tr
                      key={r.eu}
                      className={`border-t border-line ${r.eu === size ? "bg-accent font-bold text-accent-fg" : ""}`}
                    >
                      <th scope="row" className="p-3">
                        {r.eu}
                      </th>
                      <td className="p-3">{r.uk}</td>
                      <td className="p-3">{r.us}</td>
                      <td className="p-3">{r.cm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-5 text-[13px] text-fg-muted">
              Between sizes? Choose the larger one. Unworn pairs can be exchanged for a different size.
            </p>
          </div>
        </dialog>
      ) : null}
    </form>
  );
}
