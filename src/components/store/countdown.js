"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback) {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}
const nowSeconds = () => Math.floor(Date.now() / 1000);
// No clock on the server: render nothing until hydrated (keeps prerendering deterministic).
const serverSnapshot = () => null;

const pad = (n) => String(n).padStart(2, "0");

/**
 * Live sale countdown (days / hours / minutes / seconds boxes).
 * The ticking boxes are hidden from screen readers; a static sentence gives the end date.
 */
export function Countdown({ endsAt, className = "" }) {
  const now = useSyncExternalStore(subscribe, nowSeconds, serverSnapshot);
  const end = Math.floor(new Date(endsAt).getTime() / 1000);
  const endLabel = new Intl.DateTimeFormat("en-PK", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Karachi",
  }).format(new Date(endsAt));

  if (now != null && now >= end) return null;
  const left = now == null ? null : end - now;
  const parts = [
    ["Days", left == null ? null : Math.floor(left / 86400)],
    ["Hrs", left == null ? null : Math.floor((left % 86400) / 3600)],
    ["Min", left == null ? null : Math.floor((left % 3600) / 60)],
    ["Sec", left == null ? null : left % 60],
  ];

  return (
    <div className={className}>
      <p className="sr-only">Sale ends {endLabel}.</p>
      <ul aria-hidden="true" className="flex gap-2">
        {parts.map(([label, value], i) => (
          <li
            key={label}
            className={`grid min-w-16 place-items-center rounded-lg px-3 py-2 ${
              i === parts.length - 1 ? "bg-accent text-accent-fg" : "bg-surface text-fg"
            }`}
          >
            <span className="font-display text-[32px] leading-none font-semibold tabular-nums">
              {value == null ? "--" : pad(value)}
            </span>
            <span className="mt-1 text-[10px] font-bold tracking-[0.12em] uppercase">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
