"use client";

import { useState, useTransition } from "react";
import { deleteBanner, setBannerActive } from "@/actions/admin/banners";

/** Switch a banner on/off or delete it from the list. */
export function BannerRowActions({ id, isActive, name }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState(null);
  const run = (fn) =>
    start(async () => {
      const res = await fn();
      setError(res?.ok ? null : (res?.message ?? "Something went wrong."));
    });
  return (
    <span className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setBannerActive(id, !isActive))}
        className="btn-ghost min-h-10 text-sm"
      >
        {isActive ? "Switch off" : "Switch on"}
      </button>
      {confirm ? (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deleteBanner(id))}
            className="btn-ghost min-h-10 text-sm text-sale"
            aria-label={`Yes, delete ${name}`}
          >
            Yes, delete
          </button>
          <button type="button" onClick={() => setConfirm(false)} className="btn-ghost min-h-10 text-sm">
            Keep
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="btn-ghost min-h-10 text-sm text-sale"
          aria-label={`Delete ${name}`}
        >
          Delete
        </button>
      )}
      {error ? (
        <span role="alert" className="text-[13px] font-semibold text-sale">
          {error}
        </span>
      ) : null}
    </span>
  );
}
