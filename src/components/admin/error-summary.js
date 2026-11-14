"use client";

import { useEffect, useRef } from "react";
import { AlertCircle } from "@/components/ui/icons";

/**
 * Error summary for admin forms: one line per problem, each linking to and
 * focusing its field. Takes focus when it appears. `labels` maps error keys
 * to field names; `targetFor(key)` returns the element id to focus.
 */
export function ErrorSummary({ message, errors, labels = {}, targetFor = (k) => k }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
  }, [message, errors]);
  const entries = Object.entries(errors ?? {});
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
                {labels[key] ? `${labels[key]}: ` : ""}
                {text}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
