"use client";

import { useState } from "react";
import { formatPKR } from "@/lib/money";

const STEP = 500;

/**
 * Two-handle price slider with From / To boxes. Only submits `min` / `max`
 * when they differ from the full range, so an untouched slider adds no filter.
 */
export function PriceRange({ ceiling, defaultMin, defaultMax }) {
  const [lo, setLo] = useState(defaultMin ?? 0);
  const [hi, setHi] = useState(Math.min(defaultMax ?? ceiling, ceiling));
  const pct = (v) => `${(v / ceiling) * 100}%`;

  return (
    <fieldset>
      <legend className="mb-1 font-bold">Price</legend>
      <p className="mb-4 text-center text-sm text-fg-muted" aria-live="polite">
        {formatPKR(lo)} – {formatPKR(hi)}
      </p>
      <div className="dual-range" style={{ "--lo": pct(lo), "--hi": pct(hi) }}>
        <input
          type="range"
          min={0}
          max={ceiling}
          step={STEP}
          value={lo}
          aria-label="Minimum price"
          aria-valuetext={formatPKR(lo)}
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi - STEP))}
        />
        <input
          type="range"
          min={0}
          max={ceiling}
          step={STEP}
          value={hi}
          aria-label="Maximum price"
          aria-valuetext={formatPKR(hi)}
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo + STEP))}
        />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <label>
          <span className="mb-1 block text-xs font-semibold text-fg-muted">From (Rs)</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={ceiling}
            name={lo > 0 ? "min" : undefined}
            value={lo}
            onChange={(e) => setLo(Math.max(0, Math.min(Number(e.target.value) || 0, hi)))}
            className="input min-h-12"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-fg-muted">To (Rs)</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={ceiling}
            name={hi < ceiling ? "max" : undefined}
            value={hi}
            onChange={(e) => setHi(Math.min(ceiling, Math.max(Number(e.target.value) || 0, lo)))}
            className="input min-h-12"
          />
        </label>
      </div>
    </fieldset>
  );
}
