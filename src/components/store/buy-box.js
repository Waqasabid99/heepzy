"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { addToCart } from "@/actions/cart";
import { formatPKR } from "@/lib/money";

export function BuyBox({ product }) {
  const colours = [...new Map(product.variants.map((v) => [v.color, v.colorHex])).entries()];
  const [colour, setColour] = useState(colours[0]?.[0] ?? null);
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [chartOpen, setChartOpen] = useState(false);
  const [state, action, pending] = useActionState(addToCart, null);
  const chartId = useId();

  const variants = product.variants.filter((v) => v.color === colour);
  const selected = variants.find((v) => v.size === size) ?? null;
  const maxQty = selected ? Math.min(10, selected.stock) : 10;
  const unit = selected?.price ?? product.price;

  let stockNote = "Select a size to see availability.";
  if (selected)
    stockNote =
      selected.stock <= 3
        ? `Only ${selected.stock} left in EU ${selected.size} — order soon.`
        : "In stock — dispatched within 24 hours.";

  return (
    <form action={action} className="flex flex-col gap-7">
      <input type="hidden" name="variantId" value={selected?.id ?? ""} />
      <input type="hidden" name="quantity" value={qty} />

      {colours.length > 0 ? (
        <fieldset>
          <legend className="mb-3 text-sm font-bold">
            Colour: <span className="font-medium text-fg-muted">{colour}</span>
          </legend>
          <div className="flex gap-2.5">
            {colours.map(([name, hex]) => (
              <label
                key={name}
                className="cursor-pointer rounded-full border-2 border-transparent p-1 has-checked:border-fg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring"
              >
                <input
                  type="radio"
                  name="colour"
                  value={name}
                  checked={colour === name}
                  onChange={() => {
                    setColour(name);
                    setSize(null);
                  }}
                  className="sr-only"
                />
                <span className="sr-only">{name}</span>
                <span
                  aria-hidden="true"
                  className="block size-9 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]"
                  style={{ background: hex || "transparent" }}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset>
        <div className="mb-3 flex items-center justify-between gap-3">
          <legend className="text-sm font-bold">
            Size (EU): <span className="font-medium text-fg-muted">{size ?? "select"}</span>
          </legend>
          {product.sizeChart ? (
            <button
              type="button"
              aria-expanded={chartOpen}
              aria-controls={chartId}
              onClick={() => setChartOpen((o) => !o)}
              className="flex min-h-11 items-center gap-1.5 text-[13px] font-bold link-underline"
            >
              <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <rect x="2" y="8" width="20" height="8" rx="1" />
                <path d="M6 8v3M10 8v4M14 8v3M18 8v4" />
              </svg>
              Size chart
            </button>
          ) : null}
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-2">
          {variants.map((v) => {
            const out = v.stock <= 0;
            return (
              <label
                key={v.id}
                className={`grid min-h-[52px] place-items-center rounded-control border text-[15px] font-semibold transition-colors has-checked:border-fg has-checked:bg-fg has-checked:text-bg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring ${
                  out
                    ? "cursor-not-allowed border-line text-fg-muted line-through"
                    : "cursor-pointer border-line bg-surface hover:border-fg"
                }`}
              >
                <input
                  type="radio"
                  name="size"
                  value={v.size}
                  disabled={out}
                  checked={size === v.size}
                  onChange={() => {
                    setSize(v.size);
                    setQty((q) => Math.min(q, Math.max(1, v.stock)));
                  }}
                  className="sr-only"
                />
                {v.size}
                {out ? <span className="sr-only">, sold out</span> : null}
              </label>
            );
          })}
        </div>
        <p
          className={`mt-2.5 text-[13px] font-semibold ${selected && selected.stock <= 3 ? "text-sale" : selected ? "text-success" : "text-fg-muted"}`}
        >
          {stockNote}
        </p>

        {product.sizeChart && chartOpen ? (
          <div id={chartId} className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full border-collapse text-center text-[13px]">
              <caption className="px-4 pt-3.5 pb-1 text-left font-bold">
                {product.sizeChart.name}
                <span className="block font-normal text-fg-muted">{product.sizeChart.description}</span>
              </caption>
              <thead>
                <tr className="text-fg-muted">
                  <th scope="col" className="p-2.5">
                    EU
                  </th>
                  <th scope="col" className="p-2.5">
                    UK
                  </th>
                  <th scope="col" className="p-2.5">
                    US
                  </th>
                  <th scope="col" className="p-2.5">
                    Foot (cm)
                  </th>
                </tr>
              </thead>
              <tbody>
                {product.sizeChart.entries.map((r) => (
                  <tr
                    key={r.label}
                    className={`border-t border-line ${r.eu === size ? "bg-accent font-bold text-accent-fg" : ""}`}
                  >
                    <th scope="row" className="p-2.5">
                      {r.eu}
                    </th>
                    <td className="p-2.5">{r.uk}</td>
                    <td className="p-2.5">{r.us}</td>
                    <td className="p-2.5">{r.cm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <div
          role="group"
          aria-label="Quantity"
          className="flex items-center rounded-full border border-line bg-surface"
        >
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="h-14 w-12 text-xl"
          >
            −
          </button>
          <output aria-live="polite" className="min-w-7 text-center font-bold">
            {qty}
          </output>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            className="h-14 w-12 text-xl"
          >
            +
          </button>
        </div>
        <button
          type="submit"
          disabled={pending || !selected}
          aria-describedby="cart-status"
          className="btn-primary min-h-14 flex-[1_1_220px] text-[15px] font-extrabold"
        >
          {pending ? "Adding…" : selected ? `Add to cart · ${formatPKR(unit * qty)}` : "Select a size"}
        </button>
      </div>
      <p
        id="cart-status"
        role="status"
        className={`-mt-3 min-h-5 text-[13px] font-semibold ${state?.ok === false ? "text-sale" : ""}`}
      >
        {state?.message}{" "}
        {state?.ok ? (
          <Link href="/cart" className="link-underline">
            View cart
          </Link>
        ) : null}
      </p>
    </form>
  );
}
