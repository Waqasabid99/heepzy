"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";

/** "Sort" disclosure: a button that reveals a list of sort links (current one marked). */
export function SortMenu({ options, currentLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center gap-2 text-sm font-semibold tracking-wide"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={`transition-transform ${open ? "" : "rotate-180"}`}
        >
          <path d="M6 15l6-6 6 6M6 21l6-6 6 6" transform="translate(0 -4)" />
        </svg>
        <span>
          Sort<span className="hidden font-normal text-fg-muted sm:inline">: {currentLabel}</span>
        </span>
      </button>
      <ul
        id={listId}
        hidden={!open}
        className="absolute top-full right-0 z-20 mt-2 w-60 rounded-control border border-line bg-surface p-2 shadow-[0_18px_40px_rgb(0_0_0/0.12)]"
      >
        {options.map((o) => (
          <li key={o.value}>
            <Link
              href={o.href}
              aria-current={o.active ? "true" : undefined}
              onClick={() => setOpen(false)}
              className="flex min-h-10 items-center justify-between rounded-[10px] px-3 text-sm hover:bg-muted aria-[current=true]:font-bold"
            >
              {o.label}
              {o.active ? (
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                >
                  <path d="M5 12l5 5 9-10" />
                </svg>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
