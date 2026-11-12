"use client";

import { useRef } from "react";

/**
 * "Show filters" button + left slide-in sidebar, built on a native modal
 * <dialog>: focus is trapped, Esc closes it, the page behind is inert.
 * Clicking the dimmed backdrop also closes it. Animation lives in
 * globals.css (.drawer).
 */
export function FilterDrawer({ activeCount = 0, children }) {
  const ref = useRef(null);
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-haspopup="dialog"
        className="flex min-h-11 items-center gap-2.5 text-sm font-semibold tracking-wide"
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M3 5h18l-7 8.5V19l-4 2v-7.5L3 5z" />
        </svg>
        Show filters
        {activeCount ? (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-fg">
            {activeCount}
            <span className="sr-only"> active</span>
          </span>
        ) : null}
      </button>

      <dialog
        ref={ref}
        aria-labelledby="filters-title"
        className="drawer bg-surface text-fg"
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-line px-6 py-5 sm:px-8">
            <h2 id="filters-title" className="text-sm font-extrabold tracking-[0.14em] uppercase">
              Filters
            </h2>
            <button type="button" onClick={close} aria-label="Close filters" className="btn-icon border-0">
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
          {children}
        </div>
      </dialog>
    </>
  );
}
