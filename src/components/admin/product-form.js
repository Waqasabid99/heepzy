"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  deleteProduct,
  previewProductSlug,
  saveProduct,
  setProductStatus,
  uploadProductImage,
} from "@/actions/admin/products";
import { slugify } from "@/lib/slug";
import { MediaPicker } from "@/components/admin/media-picker";
import { SocialPost } from "@/components/admin/social-post";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Close,
  ExternalLink,
  Plus,
  Trash,
  Upload,
} from "@/components/ui/icons";

const field =
  "min-h-11 w-full rounded-xl border border-field bg-surface px-3.5 text-sm text-fg aria-invalid:border-sale";
const label = "mb-1.5 block text-[13px] font-bold";
const card = "rounded-2xl border border-line bg-surface p-5 sm:p-6";

function code(s, n = 3) {
  return (
    slugify(s)
      .split("-")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, n) || "X"
  );
}
const skuFor = (slug, colour, size) =>
  `HZ-${code(slug, 4)}-${slugify(colour).replace(/-/g, "").slice(0, 3).toUpperCase() || "CLR"}-${size}`.replace(
    /[^A-Za-z0-9._-]/g,
    "",
  );

/** Field name shown in the error summary, per server error key. */
const ERROR_LABELS = {
  name: "Product name",
  slug: "URL",
  shortDescription: "Short description",
  description: "Full description",
  material: "Material",
  gender: "For",
  basePrice: "Price",
  compareAtPrice: "Original price",
  costPrice: "Cost",
  sizeChartId: "Size chart",
  variants: "Colours & sizes",
  images: "Photos",
  status: "Status",
  categoryIds: "Categories",
  brandId: "Brand",
  metaTitle: "Page title",
  metaDescription: "Meta description",
};

function FieldError({ id, error }) {
  if (!error) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-sale">
      <AlertCircle className="size-4 shrink-0" />
      {error}
    </p>
  );
}

/**
 * Create / edit a product: basics, photos, pricing, colours × sizes (variants),
 * organisation and SEO. Images and variants are sent as JSON and validated on
 * the server (src/actions/admin/products.js).
 */
export function ProductForm({ product, options, social }) {
  const isNew = !product?.id;
  const [state, action, pending] = useActionState(saveProduct, null);
  const errors = state?.errors ?? {};
  const uid = useId();
  // Field defaults: the product, overridden by what was typed if the last save failed.
  const v = { ...product, ...(state?.ok === false ? state.values : {}) };
  const num = (x) => (x === "" || x == null ? "" : Number.isNaN(Number(x)) ? x : Number(x));

  const [name, setName] = useState(product?.name ?? "");
  // URL: new products get an automatic, unique slug from the name; existing ones keep theirs unless edited.
  const [slugMode, setSlugMode] = useState(isNew ? "auto" : "custom");
  const [editingSlug, setEditingSlug] = useState(false);
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [preview, setPreview] = useState({ name: "", slug: "" });
  const [sizeChartId, setSizeChartId] = useState(product?.sizeChartId ?? options.sizeCharts[0]?.id ?? "");
  const [images, setImages] = useState(product?.images ?? []);
  const [variants, setVariants] = useState(product?.variants ?? []);
  // Until the server confirms uniqueness, show the plain slugified name.
  const autoSlug = preview.name === name ? preview.slug : slugify(name);
  const effectiveSlug = slugMode === "auto" ? autoSlug : slug;

  useEffect(() => {
    if (slugMode !== "auto" || !name.trim()) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await previewProductSlug(name, product?.id ?? "");
      if (!cancelled) setPreview({ name, slug: res.slug });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [name, slugMode, product?.id]);
  const chartSizes = options.sizeCharts.find((c) => c.id === sizeChartId)?.sizes ?? [];
  const colours = [...new Map(variants.map((v) => [v.color, v.colorHex])).entries()];

  // ── Images ───────────────────────────────────────────────
  const fileRef = useRef(null);
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState(null);

  function onFiles(e) {
    const files = [...(e.target.files ?? [])].slice(0, 12 - images.length);
    e.target.value = "";
    if (!files.length) return;
    setUploadError(null);
    startUpload(async () => {
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await uploadProductImage(fd);
        if (!res.ok) {
          setUploadError(`${file.name}: ${res.message}`);
          continue;
        }
        setImages((list) => [...list, { url: res.url, alt: name ? `${name}` : "", color: colours[0]?.[0] ?? "" }]);
      }
    });
  }
  const moveImage = (i, d) =>
    setImages((list) => {
      const next = [...list];
      const j = i + d;
      if (j < 0 || j >= next.length) return list;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const patchImage = (i, patch) => setImages((list) => list.map((img, k) => (k === i ? { ...img, ...patch } : img)));

  // ── Variants ─────────────────────────────────────────────
  const [newColour, setNewColour] = useState({ name: "", hex: "#111111" });
  function addColour() {
    const colour = newColour.name.trim();
    if (!colour || colours.some(([c]) => c.toLowerCase() === colour.toLowerCase())) return;
    const sizes = chartSizes.length ? chartSizes : ["One size"];
    setVariants((list) => [
      ...list,
      ...sizes.map((size) => ({
        sku: skuFor(effectiveSlug || name, colour, size),
        color: colour,
        colorHex: newColour.hex,
        size,
        price: "",
        stock: 0,
        isActive: true,
      })),
    ]);
    setNewColour({ name: "", hex: "#111111" });
  }
  const patchVariant = (v, patch) => setVariants((list) => list.map((x) => (x === v ? { ...x, ...patch } : x)));
  const renameColour = (from, patch) =>
    setVariants((list) =>
      list.map((x) =>
        x.color === from
          ? {
              ...x,
              ...(patch.name != null ? { color: patch.name } : {}),
              ...(patch.hex ? { colorHex: patch.hex } : {}),
            }
          : x,
      ),
    );
  const removeColour = (c) => {
    setVariants((list) => list.filter((x) => x.color !== c));
    setImages((list) => list.map((img) => (img.color === c ? { ...img, color: "" } : img)));
  };
  const addSize = (colour, hex, size) =>
    setVariants((list) => [
      ...list,
      {
        sku: skuFor(effectiveSlug || name, colour, size),
        color: colour,
        colorHex: hex,
        size,
        price: "",
        stock: 0,
        isActive: true,
      },
    ]);
  const setAllStock = (colour, stock) =>
    setVariants((list) => list.map((x) => (x.color === colour ? { ...x, stock } : x)));

  const totalStock = variants.filter((v) => v.isActive).reduce((s, v) => s + (Number(v.stock) || 0), 0);

  // ── Status / delete ──────────────────────────────────────
  const [quick, startQuick] = useTransition();
  const [quickMsg, setQuickMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const runStatus = (status) =>
    startQuick(async () => {
      const res = await setProductStatus(product.id, status);
      setQuickMsg(res);
    });

  const err = (k) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${uid}-${k}-err` } : {});

  return (
    <form
      // Submitted manually (not via the action prop) so React doesn't reset the
      // fields when validation fails; a successful save redirects to fresh data.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
      noValidate
    >
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(
          variants.map(({ id, sku, color, colorHex, size, price, stock, isActive }) => ({
            ...(id ? { id } : {}),
            sku,
            color,
            colorHex,
            size,
            price: String(price ?? ""),
            stock: Number(stock) || 0,
            isActive,
          })),
        )}
      />

      {/* ───────── Main column ───────── */}
      <div className="grid content-start gap-5">
        {state && !state.ok && (state.message || Object.keys(errors).length) ? (
          <ErrorSummary
            key={JSON.stringify(state)}
            message={state.message}
            errors={errors}
            targetFor={(key) =>
              ({
                name: `${uid}-name`,
                slug: editingSlug ? `${uid}-slug` : `${uid}-slug-edit`,
                shortDescription: `${uid}-short`,
                description: `${uid}-desc`,
                material: `${uid}-material`,
                gender: `${uid}-gender`,
                basePrice: `${uid}-bp`,
                compareAtPrice: `${uid}-cap`,
                costPrice: `${uid}-cost`,
                sizeChartId: `${uid}-chart`,
                variants: `${uid}-var`,
                images: `${uid}-media`,
                status: `${uid}-status`,
                categoryIds: `${uid}-org`,
                brandId: `${uid}-brand`,
                metaTitle: `${uid}-mt`,
                metaDescription: `${uid}-md`,
              })[key]
            }
          />
        ) : null}

        <section aria-labelledby={`${uid}-basics`} className={card}>
          <h2 id={`${uid}-basics`} className="mb-4 text-base font-extrabold">
            Basics
          </h2>
          <div className="grid gap-4">
            <div>
              <label htmlFor={`${uid}-name`} className={label}>
                Product name
              </label>
              <input
                id={`${uid}-name`}
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
                className={field}
                {...err("name")}
              />
              <FieldError id={`${uid}-name-err`} error={errors.name} />
            </div>
            <div>
              <input type="hidden" name="slugMode" value={slugMode} />
              {editingSlug ? (
                <>
                  <label htmlFor={`${uid}-slug`} className={label}>
                    URL
                  </label>
                  <div className="flex items-center rounded-xl border border-field bg-surface focus-within:outline-2 focus-within:outline-ring">
                    <span className="pl-3.5 text-sm text-fg-muted">/products/</span>
                    <input
                      id={`${uid}-slug`}
                      name="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase())}
                      onBlur={() => setSlug((s) => slugify(s))}
                      maxLength={220}
                      autoFocus
                      className="min-h-11 min-w-0 flex-1 bg-transparent pr-3.5 text-sm focus-visible:outline-none"
                      {...err("slug")}
                    />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 text-[13px]">
                    <span className="text-fg-muted">Lowercase letters, numbers and dashes.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSlugMode("auto");
                        setEditingSlug(false);
                      }}
                      className="min-h-9 font-bold underline underline-offset-4"
                    >
                      Use automatic URL
                    </button>
                    {!isNew ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSlug(product.slug);
                          setSlugMode("custom");
                          setEditingSlug(false);
                        }}
                        className="min-h-9 font-bold underline underline-offset-4"
                      >
                        Keep current URL
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <span id={`${uid}-slug-label`} className={label}>
                    URL
                  </span>
                  <input type="hidden" name="slug" value={effectiveSlug} />
                  <div
                    role="group"
                    aria-labelledby={`${uid}-slug-label`}
                    className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-muted/60 pr-1.5 pl-3.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <span className="text-fg-muted">/products/</span>
                      <strong className="font-semibold">{effectiveSlug || "…"}</strong>
                    </span>
                    <button
                      id={`${uid}-slug-edit`}
                      type="button"
                      onClick={() => {
                        setSlug(effectiveSlug);
                        setSlugMode("custom");
                        setEditingSlug(true);
                      }}
                      className="min-h-9 shrink-0 rounded-lg px-3 text-[13px] font-bold hover:bg-surface"
                    >
                      Edit<span className="sr-only"> URL</span>
                    </button>
                  </div>
                  <p className="mt-1.5 text-[13px] text-fg-muted">
                    {slugMode === "auto"
                      ? "Made automatically from the name. If it's already taken, a number is added."
                      : "Changing this later breaks old links to the product."}
                  </p>
                </>
              )}
              {/* Automatic URLs are always made unique on save, so only custom ones can error. */}
              <FieldError id={`${uid}-slug-err`} error={slugMode === "custom" ? errors.slug : null} />
            </div>
            <div>
              <label htmlFor={`${uid}-short`} className={label}>
                Short description <span className="font-normal text-fg-muted">(shown near the price)</span>
              </label>
              <textarea
                id={`${uid}-short`}
                name="shortDescription"
                defaultValue={v.shortDescription}
                rows={2}
                maxLength={500}
                className={`${field} py-2.5`}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-desc`} className={label}>
                Full description
              </label>
              <textarea
                id={`${uid}-desc`}
                name="description"
                defaultValue={v.description}
                rows={6}
                maxLength={20000}
                className={`${field} py-2.5`}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-gender`} className={label}>
                  For
                </label>
                <select id={`${uid}-gender`} name="gender" defaultValue={v.gender ?? "WOMEN"} className={field}>
                  <option value="WOMEN">Women</option>
                  <option value="MEN">Men</option>
                  <option value="UNISEX">Unisex</option>
                  <option value="KIDS">Kids</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${uid}-material`} className={label}>
                  Material
                </label>
                <input
                  id={`${uid}-material`}
                  name="material"
                  defaultValue={v.material}
                  maxLength={120}
                  placeholder="e.g. Velvet / leather"
                  className={field}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section aria-labelledby={`${uid}-price`} className={card}>
          <h2 id={`${uid}-price`} className="mb-4 text-base font-extrabold">
            Pricing <span className="text-[13px] font-normal text-fg-muted">(PKR)</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor={`${uid}-bp`} className={label}>
                Price
              </label>
              <input
                id={`${uid}-bp`}
                name="basePrice"
                inputMode="decimal"
                defaultValue={num(v.basePrice)}
                placeholder="4990"
                className={field}
                {...err("basePrice")}
              />
              <FieldError id={`${uid}-basePrice-err`} error={errors.basePrice} />
            </div>
            <div>
              <label htmlFor={`${uid}-cap`} className={label}>
                Original price <span className="font-normal text-fg-muted">(for sales)</span>
              </label>
              <input
                id={`${uid}-cap`}
                name="compareAtPrice"
                inputMode="decimal"
                defaultValue={num(v.compareAtPrice)}
                placeholder="Leave empty if not on sale"
                className={field}
                {...err("compareAtPrice")}
              />
              <FieldError id={`${uid}-compareAtPrice-err`} error={errors.compareAtPrice} />
            </div>
            <div>
              <label htmlFor={`${uid}-cost`} className={label}>
                Cost <span className="font-normal text-fg-muted">(private)</span>
              </label>
              <input
                id={`${uid}-cost`}
                name="costPrice"
                inputMode="decimal"
                defaultValue={num(v.costPrice)}
                className={field}
                {...err("costPrice")}
              />
              <FieldError id={`${uid}-costPrice-err`} error={errors.costPrice} />
            </div>
          </div>
          <label className="mt-4 flex min-h-11 items-center gap-2.5 text-sm">
            <input type="checkbox" name="isTaxable" defaultChecked={v.isTaxable ?? true} className="size-5 accent-fg" />
            Charge GST on this product
          </label>
        </section>

        {/* Variants */}
        <section aria-labelledby={`${uid}-var`} className={card}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 tabIndex={-1} id={`${uid}-var`} className="text-base font-extrabold">
                Colours &amp; sizes
              </h2>
              <p className="text-[13px] text-fg-muted">
                {variants.length} {variants.length === 1 ? "variant" : "variants"} · {totalStock} in stock
              </p>
            </div>
            <div className="min-w-56">
              <label htmlFor={`${uid}-chart`} className={label}>
                Size chart
              </label>
              <select
                id={`${uid}-chart`}
                name="sizeChartId"
                value={sizeChartId}
                onChange={(e) => setSizeChartId(e.target.value)}
                className={field}
                {...err("sizeChartId")}
              >
                <option value="">No size chart</option>
                {options.sizeCharts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.sizes[0]}–{c.sizes.at(-1)})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <FieldError id={`${uid}-variants-err`} error={errors.variants} />

          <div className="mt-2 grid gap-4">
            {colours.map(([colour, hex]) => {
              const rows = variants.filter((v) => v.color === colour);
              const missing = chartSizes.filter((s) => !rows.some((r) => r.size === s));
              return (
                <fieldset key={colour} className="rounded-xl border border-line">
                  <legend className="sr-only">Colour {colour}</legend>
                  <div className="flex flex-wrap items-center gap-2 border-b border-line bg-muted/60 px-3 py-2.5">
                    <label className="sr-only" htmlFor={`${uid}-hex-${colour}`}>
                      Swatch colour for {colour}
                    </label>
                    <input
                      id={`${uid}-hex-${colour}`}
                      type="color"
                      value={hex || "#111111"}
                      onChange={(e) => renameColour(colour, { hex: e.target.value })}
                      className="size-9 cursor-pointer rounded-lg border border-line bg-surface p-0.5"
                    />
                    <label className="sr-only" htmlFor={`${uid}-cn-${colour}`}>
                      Colour name
                    </label>
                    <input
                      id={`${uid}-cn-${colour}`}
                      defaultValue={colour}
                      onBlur={(e) => {
                        const next = e.target.value.trim();
                        if (next && next !== colour && !colours.some(([c]) => c === next)) {
                          renameColour(colour, { name: next });
                          setImages((list) =>
                            list.map((img) => (img.color === colour ? { ...img, color: next } : img)),
                          );
                        } else e.target.value = colour;
                      }}
                      className="min-h-9 w-44 rounded-lg border border-field bg-surface px-2.5 text-sm font-bold"
                    />
                    <span className="text-xs text-fg-muted">
                      {rows.length} sizes · {rows.reduce((s, r) => s + (Number(r.stock) || 0), 0)} pairs
                    </span>
                    <SetAllStock onApply={(n) => setAllStock(colour, n)} colour={colour} />
                    <IconBtn
                      label={`Remove colour ${colour}`}
                      onClick={() => removeColour(colour)}
                      className="text-sale"
                    >
                      <Trash className="size-4" />
                    </IconBtn>
                  </div>
                  <div className="relative overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead className="text-left text-xs text-fg-muted">
                        <tr>
                          <th scope="col" className="px-3 py-2 font-semibold">
                            Size
                          </th>
                          <th scope="col" className="px-3 py-2 font-semibold">
                            Stock
                          </th>
                          <th scope="col" className="px-3 py-2 font-semibold">
                            Price override
                          </th>
                          <th scope="col" className="px-3 py-2 font-semibold">
                            On sale
                          </th>
                          <th scope="col" className="px-3 py-2 font-semibold">
                            SKU
                          </th>
                          <th scope="col" className="px-3 py-2">
                            <span className="sr-only">Remove</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((v) => (
                          <tr key={`${v.id ?? ""}${v.color}${v.size}`} className="border-t border-line">
                            <th scope="row" className="px-3 py-1.5 text-left font-bold">
                              {v.size}
                            </th>
                            <td className="px-3 py-1.5">
                              <input
                                aria-label={`Stock for ${colour} size ${v.size}`}
                                type="number"
                                min={0}
                                max={100000}
                                value={v.stock}
                                onChange={(e) =>
                                  patchVariant(v, { stock: e.target.value === "" ? "" : Number(e.target.value) })
                                }
                                className={`min-h-9 w-20 rounded-lg border border-field bg-surface px-2.5 ${
                                  Number(v.stock) === 0 ? "text-sale" : ""
                                }`}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                aria-label={`Price override for ${colour} size ${v.size}`}
                                inputMode="decimal"
                                value={v.price}
                                onChange={(e) => patchVariant(v, { price: e.target.value })}
                                placeholder="Same"
                                className="min-h-9 w-24 rounded-lg border border-field bg-surface px-2.5"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                aria-label={`Sell ${colour} size ${v.size}`}
                                type="checkbox"
                                checked={v.isActive}
                                onChange={(e) => patchVariant(v, { isActive: e.target.checked })}
                                className="size-5 accent-fg"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                aria-label={`SKU for ${colour} size ${v.size}`}
                                value={v.sku}
                                onChange={(e) => patchVariant(v, { sku: e.target.value })}
                                maxLength={64}
                                className="min-h-9 w-44 rounded-lg border border-field bg-surface px-2.5 font-mono text-xs"
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <IconBtn
                                label={`Remove ${colour} size ${v.size}`}
                                onClick={() => setVariants((list) => list.filter((x) => x !== v))}
                              >
                                <Close className="size-4" />
                              </IconBtn>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {missing.length ? (
                    <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-3 py-2.5">
                      <span className="text-xs text-fg-muted">Add size:</span>
                      {missing.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addSize(colour, hex, s)}
                          className="inline-flex min-h-8 items-center gap-1 rounded-full border border-line px-3 text-xs font-semibold hover:border-fg"
                        >
                          <Plus className="size-3" /> {s}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </fieldset>
              );
            })}

            <div className="flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-line p-3">
              <div>
                <label htmlFor={`${uid}-ncn`} className={label}>
                  Add a colour
                </label>
                <input
                  id={`${uid}-ncn`}
                  value={newColour.name}
                  onChange={(e) => setNewColour((c) => ({ ...c, name: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addColour();
                    }
                  }}
                  placeholder="e.g. Rani Red"
                  maxLength={60}
                  className={`${field} w-52`}
                />
              </div>
              <div>
                <label htmlFor={`${uid}-nch`} className={label}>
                  Swatch
                </label>
                <input
                  id={`${uid}-nch`}
                  type="color"
                  value={newColour.hex}
                  onChange={(e) => setNewColour((c) => ({ ...c, hex: e.target.value }))}
                  className="h-11 w-14 cursor-pointer rounded-xl border border-field bg-surface p-1"
                />
              </div>
              <button
                type="button"
                onClick={addColour}
                disabled={!newColour.name.trim()}
                className="btn-outline min-h-11"
              >
                <Plus className="size-4" /> Add with {chartSizes.length ? `${chartSizes.length} sizes` : "one size"}
              </button>
            </div>
          </div>
        </section>

        {/* Photos */}
        <section aria-labelledby={`${uid}-media`} className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 tabIndex={-1} id={`${uid}-media`} className="text-base font-extrabold">
                Photos
              </h2>
              <p className="text-[13px] text-fg-muted">
                First photo is the main one. Square photos on a clean background look best. Up to 12.
              </p>
              {!colours.length ? (
                <p className="text-[13px] text-fg-muted">
                  Tip: add colours above first, then tag each photo with the colour it shows.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <MediaPicker
                existing={images.map((img) => img.url)}
                remaining={12 - images.length}
                disabled={uploading}
                onAdd={(picked) =>
                  setImages((list) => [
                    ...list,
                    ...picked
                      .filter((m) => !list.some((img) => img.url === m.url))
                      .slice(0, 12 - list.length)
                      .map((m) => ({ url: m.url, alt: m.alt || name, color: colours[0]?.[0] ?? "" })),
                  ])
                }
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || images.length >= 12}
                className="btn-outline min-h-11"
              >
                <Upload className="size-4" /> {uploading ? "Uploading…" : "Upload photos"}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              hidden
              onChange={onFiles}
            />
          </div>
          {uploadError ? <FieldError id={`${uid}-up-err`} error={uploadError} /> : null}
          <FieldError id={`${uid}-images-err`} error={errors.images} />
          {images.length ? (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {images.map((img, i) => (
                <li key={`${img.url}-${i}`} className="flex gap-3 rounded-xl border border-line p-2.5">
                  <span className="relative size-24 shrink-0 overflow-hidden bg-muted">
                    <Image src={img.url} alt="" fill sizes="96px" className="object-cover" />
                    {i === 0 ? (
                      <span className="absolute top-1 left-1 bg-fg px-1.5 py-0.5 text-[10px] font-bold text-bg">
                        Main
                      </span>
                    ) : null}
                  </span>
                  <div className="grid min-w-0 flex-1 content-start gap-2">
                    <label className="sr-only" htmlFor={`${uid}-alt-${i}`}>
                      Description of photo {i + 1}
                    </label>
                    <input
                      id={`${uid}-alt-${i}`}
                      value={img.alt}
                      onChange={(e) => patchImage(i, { alt: e.target.value })}
                      placeholder="Describe the photo (alt text)"
                      maxLength={200}
                      className="min-h-9 w-full rounded-lg border border-field bg-surface px-2.5 text-[13px]"
                    />
                    <label className="sr-only" htmlFor={`${uid}-imgc-${i}`}>
                      Colour shown in photo {i + 1}
                    </label>
                    <select
                      id={`${uid}-imgc-${i}`}
                      value={img.color}
                      onChange={(e) => patchImage(i, { color: e.target.value })}
                      className="min-h-9 w-full rounded-lg border border-field bg-surface px-2 text-[13px]"
                    >
                      <option value="">All colours</option>
                      {colours.map(([c]) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      <IconBtn
                        label={`Move photo ${i + 1} earlier`}
                        onClick={() => moveImage(i, -1)}
                        disabled={i === 0}
                      >
                        <ChevronUp className="size-4" />
                      </IconBtn>
                      <IconBtn
                        label={`Move photo ${i + 1} later`}
                        onClick={() => moveImage(i, 1)}
                        disabled={i === images.length - 1}
                      >
                        <ChevronDown className="size-4" />
                      </IconBtn>
                      <IconBtn
                        label={`Remove photo ${i + 1}`}
                        onClick={() => setImages((list) => list.filter((_, k) => k !== i))}
                        className="ml-auto text-sale"
                      >
                        <Trash className="size-4" />
                      </IconBtn>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-1 grid w-full place-items-center gap-2 rounded-xl border-2 border-dashed border-line px-6 py-10 text-sm text-fg-muted hover:border-fg"
            >
              <Upload className="size-6" />
              Click to upload JPG, PNG, WebP or AVIF (max 4 MB each)
            </button>
          )}
        </section>

        {/* SEO */}
        <section aria-labelledby={`${uid}-seo`} className={card}>
          <h2 id={`${uid}-seo`} className="mb-1 text-base font-extrabold">
            Search engine listing
          </h2>
          <p className="mb-4 text-[13px] text-fg-muted">
            Optional. Leave empty to use the product name and short description.
          </p>
          <div className="grid gap-4">
            <div>
              <label htmlFor={`${uid}-mt`} className={label}>
                Page title
              </label>
              <input id={`${uid}-mt`} name="metaTitle" defaultValue={v.metaTitle} maxLength={200} className={field} />
            </div>
            <div>
              <label htmlFor={`${uid}-md`} className={label}>
                Meta description
              </label>
              <textarea
                id={`${uid}-md`}
                name="metaDescription"
                defaultValue={v.metaDescription}
                rows={2}
                maxLength={320}
                className={`${field} py-2.5`}
              />
            </div>
          </div>
        </section>
      </div>

      {/* ───────── Sidebar ───────── */}
      <aside className="grid content-start gap-5 xl:sticky xl:top-6">
        {/* On narrower screens Publishing (with the save button) comes last, after Organisation. */}
        <section aria-labelledby={`${uid}-pub`} className={`${card} order-last xl:order-none`}>
          <h2 id={`${uid}-pub`} className="mb-4 text-base font-extrabold">
            Publishing
          </h2>
          <label htmlFor={`${uid}-status`} className={label}>
            Status
          </label>
          <select id={`${uid}-status`} name="status" defaultValue={v.status ?? "DRAFT"} className={field}>
            <option value="DRAFT">Draft (hidden)</option>
            <option value="ACTIVE">Active (in the store)</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <label className="mt-3 flex min-h-11 items-center gap-2.5 text-sm">
            <input type="checkbox" name="isFeatured" defaultChecked={v.isFeatured} className="size-5 accent-fg" />
            Feature on the home page
          </label>
          <button type="submit" disabled={pending || uploading} className="btn-ink mt-3 w-full">
            {pending ? "Saving…" : isNew ? "Create product" : "Save changes"}
          </button>
          {!isNew ? (
            <div className="mt-3 grid gap-2">
              {product.status === "ACTIVE" ? (
                <Link
                  href={`/products/${product.slug}`}
                  target="_blank"
                  className="btn-ghost min-h-10 justify-start px-2 text-sm"
                >
                  <ExternalLink className="size-4" /> View in store
                  <span className="sr-only">(opens in a new tab)</span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={quick}
                  onClick={() => runStatus("ACTIVE")}
                  className="btn-ghost min-h-10 justify-start px-2 text-sm"
                >
                  <Check className="size-4" /> Publish now
                </button>
              )}
              {quickMsg ? (
                <p role="status" className={`text-[13px] font-semibold ${quickMsg.ok ? "text-success" : "text-sale"}`}>
                  {quickMsg.message}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>

        <section aria-labelledby={`${uid}-org`} className={card}>
          <h2 tabIndex={-1} id={`${uid}-org`} className="mb-4 text-base font-extrabold">
            Organisation
          </h2>
          <fieldset>
            <legend className={label}>Categories</legend>
            <div className="grid gap-0.5">
              {options.categories.map((c) => (
                <label key={c.id} className="flex min-h-10 items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    name="categoryIds"
                    value={c.id}
                    defaultChecked={v.categoryIds?.includes(c.id)}
                    className="size-5 accent-fg"
                  />
                  {c.name}
                </label>
              ))}
            </div>
            <FieldError id={`${uid}-categoryIds-err`} error={errors.categoryIds} />
          </fieldset>
          <label htmlFor={`${uid}-brand`} className={`${label} mt-4`}>
            Brand
          </label>
          <select
            id={`${uid}-brand`}
            name="brandId"
            defaultValue={v.brandId ?? options.brands[0]?.id ?? ""}
            className={field}
          >
            <option value="">No brand</option>
            {options.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </section>

        {!isNew && social ? (
          <section aria-labelledby={`${uid}-social`} className={card}>
            <h2 id={`${uid}-social`} className="mb-1 text-base font-extrabold">
              Social media
            </h2>
            <p className="mb-3 text-[13px] text-fg-muted">
              Create a ready-to-post image and caption for Instagram and Facebook.
            </p>
            <SocialPost
              productId={product.id}
              images={product.images}
              settings={social.settings}
              productUrl={`${social.siteUrl}/products/${product.slug}`}
              summary={{
                slug: product.slug,
                name: product.name,
                // A running offer wins over the saved price (same as the store).
                price: social.offer ? social.offer.price : Number(product.basePrice),
                compareAt: social.offer
                  ? social.offer.compareAt
                  : product.compareAtPrice
                    ? Number(product.compareAtPrice)
                    : null,
                offer: social.offer ? { name: social.offer.name, endsAt: social.offer.endsAt } : null,
                shortDescription: product.shortDescription,
                gender: product.gender,
                categorySlugs: options.categories.filter((c) => product.categoryIds.includes(c.id)).map((c) => c.slug),
                colours: [...new Set(product.variants.filter((x) => x.isActive).map((x) => x.color))],
                sizes: [...new Set(product.variants.filter((x) => x.isActive && x.stock > 0).map((x) => x.size))].sort(
                  (a, b) => Number(a) - Number(b),
                ),
              }}
            />
          </section>
        ) : null}

        {!isNew ? (
          <section aria-labelledby={`${uid}-danger`} className={card}>
            <h2 id={`${uid}-danger`} className="mb-2 text-base font-extrabold">
              Remove
            </h2>
            <p className="mb-3 text-[13px] text-fg-muted">
              {product.hasOrders
                ? "This product has orders, so it will be hidden and kept for order history."
                : "Deleting removes the product, its photos list and sizes permanently."}
            </p>
            {product.status !== "ARCHIVED" ? (
              <button
                type="button"
                disabled={quick}
                onClick={() => runStatus("ARCHIVED")}
                className="btn-outline mb-2 min-h-10 w-full text-sm"
              >
                Archive instead
              </button>
            ) : null}
            {confirmDelete ? (
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={quick}
                  onClick={() => startQuick(() => deleteProduct(product.id))}
                  className="btn min-h-10 w-full bg-sale text-sm text-white hover:opacity-90"
                >
                  <Trash className="size-4" /> Yes, delete “{product.name}”
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="btn-ghost min-h-10 text-sm">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn-ghost min-h-10 w-full text-sm text-sale"
              >
                <Trash className="size-4" /> Delete product
              </button>
            )}
          </section>
        ) : null}
      </aside>
    </form>
  );
}

/**
 * Error summary at the top of the form: one line per problem, each a link that
 * scrolls to and focuses the field. Receives focus when it appears.
 */
function ErrorSummary({ message, errors, targetFor }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const entries = Object.entries(errors);
  const go = (id) => {
    const el = id && document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.focus({ preventScroll: true });
  };
  const heading =
    message ??
    (entries.length === 1 ? "There's a problem with 1 field" : `There are problems with ${entries.length} fields`);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="error-summary-title"
      className="rounded-xl border-2 border-sale bg-danger-bg px-4 py-3.5 text-sale focus-visible:outline-offset-2"
    >
      <p id="error-summary-title" className="flex items-center gap-2 text-sm font-extrabold">
        <AlertCircle className="size-4 shrink-0" />
        {heading}
      </p>
      {entries.length ? (
        <ul className="mt-2 grid gap-1 pl-6 text-sm">
          {entries.map(([key, text]) => (
            <li key={key}>
              <a
                href={`#${targetFor(key) ?? ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(targetFor(key));
                }}
                className="font-semibold underline underline-offset-4 hover:decoration-2"
              >
                {ERROR_LABELS[key] ? `${ERROR_LABELS[key]}: ` : ""}
                {text}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function IconBtn({ label: text, children, className = "", ...props }) {
  return (
    <button
      type="button"
      aria-label={text}
      title={text}
      className={`grid size-9 place-items-center rounded-lg border border-line hover:bg-muted disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function SetAllStock({ colour, onApply }) {
  const [value, setValue] = useState("");
  return (
    <span className="ml-auto flex items-center gap-1">
      <label className="sr-only" htmlFor={`all-${colour}`}>
        Set stock for every {colour} size
      </label>
      <input
        id={`all-${colour}`}
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Qty"
        className="min-h-9 w-16 rounded-lg border border-field bg-surface px-2 text-sm"
      />
      <button
        type="button"
        disabled={value === ""}
        onClick={() => onApply(Math.max(0, Number(value) || 0))}
        className="min-h-9 rounded-lg border border-line px-2.5 text-xs font-semibold hover:bg-muted disabled:opacity-40"
      >
        Set all
      </button>
    </span>
  );
}
