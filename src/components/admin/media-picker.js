"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { listProductMedia } from "@/actions/admin/products";
import { Check, Close, ImageIcon, Search } from "@/components/ui/icons";

/**
 * "Choose from gallery": a modal grid of existing product photos and unused
 * uploads. Pick several, then add them to the product in one go.
 *
 *   <MediaPicker existing={urls} remaining={12 - images.length} onAdd={(items) => …} />
 */
export function MediaPicker({ existing = [], remaining = 12, onAdd, disabled }) {
  const dialogRef = useRef(null);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, startLoading] = useTransition();
  const used = new Set(existing);

  function open() {
    setSelected([]);
    dialogRef.current?.showModal();
    startLoading(async () => {
      try {
        setItems(await listProductMedia());
        setError(null);
      } catch {
        setError("Couldn't load the gallery. Please try again.");
      }
    });
  }
  const close = () => dialogRef.current?.close();

  function toggle(item) {
    setSelected((list) =>
      list.some((x) => x.url === item.url)
        ? list.filter((x) => x.url !== item.url)
        : list.length < remaining
          ? [...list, item]
          : list,
    );
  }

  const q = query.trim().toLowerCase();
  const visible = (items ?? []).filter((m) => {
    if (filter === "unused" && m.products.length) return false;
    if (!q) return true;
    return m.alt.toLowerCase().includes(q) || m.products.some((p) => p.toLowerCase().includes(q));
  });

  return (
    <>
      <button type="button" onClick={open} disabled={disabled || remaining <= 0} className="btn-outline min-h-11">
        <ImageIcon className="size-4" /> Choose from gallery
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="media-picker-title"
        className="modal bg-surface text-fg"
        style={{ width: "min(68rem, calc(100vw - 2rem))" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 id="media-picker-title" className="font-display text-2xl font-semibold uppercase">
              Media gallery
            </h2>
            <p className="text-[13px] text-fg-muted">
              Select up to {remaining} {remaining === 1 ? "photo" : "photos"}. Photos already on this product are
              marked.
            </p>
          </div>
          <button type="button" onClick={close} aria-label="Close gallery" className="btn-icon border-0">
            <Close />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3 sm:px-6">
          <div className="relative min-w-52 flex-1">
            <label htmlFor="media-q" className="sr-only">
              Search photos by product or description
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-muted" />
            <input
              id="media-q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              // This dialog sits inside the product form: Enter must not submit it.
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              placeholder="Search by product or description"
              className="h-10 w-full rounded-full border border-line bg-surface pr-4 pl-9 text-sm"
            />
          </div>
          <div role="group" aria-label="Show" className="flex gap-1.5">
            {[
              ["all", "All photos"],
              ["unused", "Unused"],
            ].map(([key, text]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className="min-h-10 rounded-full border border-line px-4 text-[13px] font-bold aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-bg"
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[60dvh] overflow-y-auto px-5 py-4 sm:px-6">
          {error ? (
            <p role="alert" className="py-10 text-center text-sm font-semibold text-sale">
              {error}
            </p>
          ) : loading || !items ? (
            <p role="status" className="py-10 text-center text-sm text-fg-muted">
              Loading photos…
            </p>
          ) : visible.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {visible.map((m) => {
                const isUsed = used.has(m.url);
                const isSelected = selected.some((x) => x.url === m.url);
                const label = m.products.length ? m.products.join(", ") : "Unused upload";
                return (
                  <li key={m.url}>
                    <button
                      type="button"
                      disabled={isUsed}
                      aria-pressed={isSelected}
                      onClick={() => toggle(m)}
                      className="group relative block w-full text-left disabled:cursor-not-allowed"
                    >
                      <span
                        className={`relative block aspect-square overflow-hidden bg-muted outline-offset-2 ${
                          isSelected ? "outline-3 outline-accent" : "group-hover:outline-2 group-hover:outline-line"
                        } ${isUsed ? "opacity-45" : ""}`}
                      >
                        <Image src={m.url} alt="" fill sizes="160px" className="object-cover" />
                        {isSelected ? (
                          <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-accent text-accent-fg">
                            <Check className="size-4" strokeWidth={2.5} />
                          </span>
                        ) : null}
                        {isUsed ? (
                          <span className="absolute inset-x-0 bottom-0 bg-fg/80 py-1 text-center text-[11px] font-bold text-bg">
                            Added
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1.5 block truncate text-xs font-semibold">{label}</span>
                      <span className="sr-only">
                        {m.alt ? `, ${m.alt}` : ""}
                        {isUsed ? ", already on this product" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-fg-muted">No photos match.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-6">
          <p className="text-sm text-fg-muted" role="status">
            {selected.length} selected
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={close} className="btn-ghost min-h-11">
              Cancel
            </button>
            <button
              type="button"
              disabled={!selected.length}
              onClick={() => {
                onAdd(selected);
                close();
              }}
              className="btn-ink min-h-11"
            >
              Add {selected.length || ""} {selected.length === 1 ? "photo" : "photos"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
