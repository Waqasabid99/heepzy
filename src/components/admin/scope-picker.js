"use client";

import { useState } from "react";
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { Check, Close, Search } from "@/components/ui/icons";

/**
 * "Applies to" picker shared by vouchers and offers: everything, or any mix
 * of products, categories and brands. Submits hidden inputs `appliesToAll`
 * ("1"/"0"), `productIds`, `categoryIds`, `brandIds` (JSON arrays).
 *
 * options = { products: [{ id, name, status, brandId, categoryIds }], categories: [{ id, name }], brands: [{ id, name }] }
 */
export function ScopePicker({ idPrefix, options, initial, error, noun = "This voucher" }) {
  const [all, setAll] = useState(initial.appliesToAll);
  const [productIds, setProductIds] = useState(initial.productIds);
  const [categoryIds, setCategoryIds] = useState(initial.categoryIds);
  const [brandIds, setBrandIds] = useState(initial.brandIds);
  const [query, setQuery] = useState("");

  const toggle = (list, setList, id) => setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const q = query.trim().toLowerCase();
  const matches = (q ? options.products.filter((p) => p.name.toLowerCase().includes(q)) : options.products).slice(
    0,
    50,
  );
  const byId = new Map(options.products.map((p) => [p.id, p]));

  const covered = all
    ? options.products.length
    : options.products.filter(
        (p) =>
          productIds.includes(p.id) ||
          (p.brandId && brandIds.includes(p.brandId)) ||
          p.categoryIds.some((c) => categoryIds.includes(c)),
      ).length;

  const chip =
    "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 text-[13px] font-semibold has-checked:border-fg has-checked:bg-fg has-checked:text-bg has-focus-visible:outline-2 has-focus-visible:outline-offset-2";

  return (
    <fieldset id={`${idPrefix}-scope`} tabIndex={-1} aria-describedby={error ? `${idPrefix}-scope-err` : undefined}>
      <legend className="mb-2 text-[13px] font-bold">Applies to</legend>
      <input type="hidden" name="appliesToAll" value={all ? "1" : "0"} />
      <input type="hidden" name="productIds" value={JSON.stringify(all ? [] : productIds)} />
      <input type="hidden" name="categoryIds" value={JSON.stringify(all ? [] : categoryIds)} />
      <input type="hidden" name="brandIds" value={JSON.stringify(all ? [] : brandIds)} />

      <div className="grid gap-2 sm:grid-cols-2">
        {[
          [true, "Every product", "Including products added later."],
          [false, "Selected items only", "Pick products, categories or brands."],
        ].map(([value, title, hint]) => (
          <label
            key={title}
            className="flex cursor-pointer gap-3 rounded-xl border border-line p-3.5 has-checked:border-fg has-checked:bg-muted"
          >
            <input
              type="radio"
              name={`${idPrefix}-scope-mode`}
              checked={all === value}
              onChange={() => setAll(value)}
              className="mt-0.5 size-4 accent-current"
            />
            <span>
              <span className="block text-sm font-bold">{title}</span>
              <span className="block text-[13px] text-fg-muted">{hint}</span>
            </span>
          </label>
        ))}
      </div>

      {!all ? (
        <div className="mt-4 grid gap-5">
          {options.categories.length ? (
            <div>
              <p className="mb-2 text-[13px] font-bold" id={`${idPrefix}-cats`}>
                Categories
              </p>
              <div role="group" aria-labelledby={`${idPrefix}-cats`} className="flex flex-wrap gap-2">
                {options.categories.map((c) => (
                  <label key={c.id} className={chip}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={categoryIds.includes(c.id)}
                      onChange={() => toggle(categoryIds, setCategoryIds, c.id)}
                    />
                    {categoryIds.includes(c.id) ? <Check className="size-3.5" /> : null}
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {options.brands.length ? (
            <div>
              <p className="mb-2 text-[13px] font-bold" id={`${idPrefix}-brands`}>
                Brands
              </p>
              <div role="group" aria-labelledby={`${idPrefix}-brands`} className="flex flex-wrap gap-2">
                {options.brands.map((b) => (
                  <label key={b.id} className={chip}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={brandIds.includes(b.id)}
                      onChange={() => toggle(brandIds, setBrandIds, b.id)}
                    />
                    {brandIds.includes(b.id) ? <Check className="size-3.5" /> : null}
                    {b.name}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <label htmlFor={`${idPrefix}-products`} className="mb-2 block text-[13px] font-bold">
              Products
            </label>
            <Combobox multiple value={productIds} onChange={setProductIds} onClose={() => setQuery("")}>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-muted" />
                <ComboboxInput
                  id={`${idPrefix}-products`}
                  autoComplete="off"
                  placeholder="Search products to add"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-field bg-surface pr-3.5 pl-10 text-sm"
                />
              </div>
              <ComboboxOptions
                modal={false}
                anchor="bottom start"
                className="z-50 max-h-72 w-(--input-width) overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg [--anchor-gap:6px] empty:invisible"
              >
                {matches.map((p) => (
                  <ComboboxOption
                    key={p.id}
                    value={p.id}
                    className="group flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-sm data-focus:bg-muted"
                  >
                    <span>
                      {p.name}
                      {p.status !== "ACTIVE" ? (
                        <span className="ml-2 text-xs text-fg-muted">({p.status.toLowerCase()})</span>
                      ) : null}
                    </span>
                    <Check className="invisible size-4 text-brand group-data-selected:visible" />
                  </ComboboxOption>
                ))}
              </ComboboxOptions>
            </Combobox>
            {productIds.length ? (
              <ul className="mt-2 flex flex-wrap gap-2" aria-label="Selected products">
                {productIds.map((id) => (
                  <li
                    key={id}
                    className="inline-flex min-h-9 items-center gap-1 rounded-full bg-muted pr-1 pl-3 text-[13px] font-semibold"
                  >
                    {byId.get(id)?.name ?? "Removed product"}
                    <button
                      type="button"
                      onClick={() => setProductIds(productIds.filter((x) => x !== id))}
                      aria-label={`Remove ${byId.get(id)?.name ?? "product"}`}
                      className="grid size-7 place-items-center rounded-full hover:bg-surface"
                    >
                      <Close className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-[13px] text-fg-muted" role="status">
        {noun} covers {covered} of {options.products.length} {options.products.length === 1 ? "product" : "products"}
        {all ? "" : " right now"}.
      </p>
      {error ? (
        <p id={`${idPrefix}-scope-err`} className="mt-1 text-[13px] font-semibold text-sale">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
