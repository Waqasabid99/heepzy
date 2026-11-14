"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { adjustStock } from "@/actions/admin/inventory";
import { AlertCircle, Check, Close, ListIcon } from "@/components/ui/icons";

const LEVEL = {
  in: { text: "In stock", cls: "bg-success-bg text-success" },
  low: { text: "Low", cls: "bg-warning-bg text-warning" },
  out: { text: "Sold out", cls: "bg-danger-bg text-sale" },
};

/** Variant stock table with an "Adjust stock" dialog (add / remove / set exact). */
export function InventoryTable({ rows, reasons }) {
  const uid = useId();
  const dialogRef = useRef(null);
  const [row, setRow] = useState(null);
  const [mode, setMode] = useState("add");
  const [qty, setQty] = useState("");
  const [state, action, pending] = useActionState(adjustStock, null);
  // Hide the previous result when the dialog is opened for another size.
  const [submitted, setSubmitted] = useState(false);
  const failed = submitted && state?.ok === false ? state : null;
  const errors = failed?.errors ?? {};
  const flash = submitted && state?.ok ? state.message : null;

  // Close the dialog after a successful save (the confirmation is derived from `state`).
  useEffect(() => {
    if (state?.ok) dialogRef.current?.close();
  }, [state]);

  function openFor(r, m = "add") {
    setRow(r);
    setMode(m);
    setQty("");
    setSubmitted(false);
    dialogRef.current?.showModal();
  }

  const n = Number.parseInt(qty, 10);
  const preview =
    row && Number.isFinite(n) && n >= 0
      ? mode === "add"
        ? row.stock + n
        : mode === "remove"
          ? row.stock - n
          : n
      : null;
  const defaultReason = mode === "add" ? "RESTOCK" : mode === "remove" ? "DAMAGED" : "ADJUSTMENT";
  const modeBtn = "min-h-10 flex-1 rounded-lg px-3 text-[13px] font-bold aria-pressed:bg-fg aria-pressed:text-bg";

  return (
    <>
      {flash ? (
        <p
          role="status"
          className="mb-4 flex items-center gap-2 rounded-xl bg-success-bg px-4 py-3 text-sm font-semibold text-success"
        >
          <Check className="size-4" /> {flash}
        </p>
      ) : null}

      <div className="relative overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line text-xs font-bold tracking-[0.06em] text-fg-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">
                Product
              </th>
              <th scope="col" className="px-4 py-3">
                Colour / size
              </th>
              <th scope="col" className="px-4 py-3">
                SKU
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                In stock
              </th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-muted/60">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/products/${r.productId}`} className="group flex items-center gap-3">
                    <span className="relative size-10 shrink-0 overflow-hidden bg-muted">
                      {r.image ? <Image src={r.image} alt="" fill sizes="40px" className="object-cover" /> : null}
                    </span>
                    <span>
                      <span className="block font-bold group-hover:underline">{r.productName}</span>
                      {r.productStatus !== "ACTIVE" ? (
                        <span className="block text-xs text-fg-muted">
                          {r.productStatus === "DRAFT" ? "Draft" : "Archived"}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-3.5 shrink-0 rounded-full border border-line"
                      style={{ background: r.colorHex || "transparent" }}
                    />
                    {r.color} · <strong>{r.size}</strong>
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{r.sku}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${LEVEL[r.level].cls}`}>
                    {LEVEL[r.level].text}
                  </span>
                </td>
                <td className={`px-4 py-2.5 text-right text-base font-bold ${r.stock <= 0 ? "text-sale" : ""}`}>
                  {r.stock}
                </td>
                <td className="px-4 py-2.5">
                  <span className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => openFor(r, "add")}
                      className="min-h-9 rounded-lg border border-line px-3 text-[13px] font-bold hover:border-fg"
                    >
                      Adjust
                      <span className="sr-only">
                        {" "}
                        stock for {r.productName}, {r.color}, size {r.size}
                      </span>
                    </button>
                    <Link
                      href={`/admin/inventory/history?variant=${r.id}`}
                      aria-label={`Stock history for ${r.productName}, ${r.color}, size ${r.size}`}
                      title="History"
                      className="grid size-9 place-items-center rounded-lg border border-line hover:border-fg"
                    >
                      <ListIcon className="size-4" />
                    </Link>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={`${uid}-title`}
        className="modal bg-surface text-fg"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
      >
        {row ? (
          <form
            key={row.id}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setSubmitted(true);
              startTransition(() => action(fd));
            }}
            noValidate
          >
            <input type="hidden" name="variantId" value={row.id} />
            <input type="hidden" name="mode" value={mode} />
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
              <div>
                <h2 id={`${uid}-title`} className="font-display text-2xl font-semibold uppercase">
                  Adjust stock
                </h2>
                <p className="text-[13px] text-fg-muted">
                  {row.productName} · {row.color} · size {row.size} · <span className="font-mono">{row.sku}</span>
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

            <div className="grid gap-4 px-6 py-5">
              {failed?.message ? (
                <p
                  role="alert"
                  className="flex items-center gap-2 rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-sale"
                >
                  <AlertCircle className="size-4" /> {failed.message}
                </p>
              ) : null}

              <div role="group" aria-label="Type of change" className="flex gap-1 rounded-xl border border-line p-1">
                {[
                  ["add", "Add stock"],
                  ["remove", "Remove stock"],
                  ["set", "Set exact count"],
                ].map(([key, text]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={mode === key}
                    onClick={() => setMode(key)}
                    className={modeBtn}
                  >
                    {text}
                  </button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${uid}-qty`} className="mb-1.5 block text-[13px] font-bold">
                    {mode === "set" ? "New stock count" : "Quantity (pairs)"}
                  </label>
                  <input
                    id={`${uid}-qty`}
                    name="quantity"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100000}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    autoFocus
                    aria-invalid={errors.quantity ? true : undefined}
                    aria-describedby={errors.quantity ? `${uid}-qty-err` : undefined}
                    className="min-h-12 w-full rounded-xl border border-field bg-surface px-3.5 text-lg font-bold aria-invalid:border-sale"
                  />
                  {!errors.quantity && preview != null && preview < 0 ? (
                    <p className="mt-1.5 text-[13px] font-semibold text-sale">
                      Only {row.stock} in stock, so you can remove at most {row.stock}.
                    </p>
                  ) : null}
                  {errors.quantity ? (
                    <p id={`${uid}-qty-err`} className="mt-1.5 text-[13px] font-semibold text-sale">
                      {errors.quantity}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-xl bg-muted px-4 py-3 text-sm">
                  <p className="text-fg-muted">
                    Now: <strong className="text-fg">{row.stock}</strong>
                  </p>
                  <p className="mt-1 text-fg-muted">
                    After:{" "}
                    <strong className={`text-lg ${preview != null && preview < 0 ? "text-sale" : "text-fg"}`}>
                      {preview ?? "–"}
                    </strong>
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor={`${uid}-reason`} className="mb-1.5 block text-[13px] font-bold">
                  Reason
                </label>
                <select
                  key={mode}
                  id={`${uid}-reason`}
                  name="reason"
                  defaultValue={defaultReason}
                  className="min-h-11 w-full rounded-xl border border-field bg-surface px-3 text-sm"
                >
                  {Object.entries(reasons).map(([key, text]) => (
                    <option key={key} value={key}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`${uid}-note`} className="mb-1.5 block text-[13px] font-bold">
                  Note <span className="font-normal text-fg-muted">(optional, e.g. supplier invoice number)</span>
                </label>
                <input
                  id={`${uid}-note`}
                  name="note"
                  maxLength={255}
                  className="min-h-11 w-full rounded-xl border border-field bg-surface px-3.5 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
              <button type="button" onClick={() => dialogRef.current?.close()} className="btn-ghost min-h-11">
                Cancel
              </button>
              <button type="submit" disabled={pending || preview == null || preview < 0} className="btn-ink min-h-11">
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        ) : null}
      </dialog>
    </>
  );
}
