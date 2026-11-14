"use client";

import { useMemo, useState } from "react";
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react";
import { CITIES_BY_PROVINCE } from "@/lib/pk-cities";
import { Check, ChevronDown } from "@/components/ui/icons";

/**
 * Searchable city picker limited to the chosen province. Small towns that are
 * not in the list can still be entered via the "Deliver to …" option.
 * Submits as a hidden `name` input, so it works inside a plain <form>.
 */
export function CityCombobox({ id, name, province, value, onChange, className, invalidProps }) {
  const [query, setQuery] = useState("");
  const cities = useMemo(() => CITIES_BY_PROVINCE[province] ?? [], [province]);
  const q = query.trim().toLowerCase();
  const matches = q ? cities.filter((c) => c.toLowerCase().includes(q)) : cities;
  // Prefix matches first ("Mul" → Multan before Kamalia).
  const sorted = q
    ? [
        ...matches.filter((c) => c.toLowerCase().startsWith(q)),
        ...matches.filter((c) => !c.toLowerCase().startsWith(q)),
      ]
    : matches;
  const typed = query.trim().replace(/\s+/g, " ");
  const exact = cities.some((c) => c.toLowerCase() === q);

  return (
    <Combobox
      value={value || null}
      onChange={(v) => onChange(v ?? "")}
      onClose={() => setQuery("")}
      name={name}
      disabled={!province}
      immediate
    >
      <div className="relative">
        <ComboboxInput
          id={id}
          autoComplete="off"
          placeholder={province ? "Search your city" : "Choose a province first"}
          displayValue={(c) => c ?? ""}
          onChange={(e) => setQuery(e.target.value)}
          className={`${className} pr-11 disabled:cursor-not-allowed disabled:opacity-60`}
          {...invalidProps}
        />
        <ComboboxButton
          aria-label="Show cities"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-fg-muted disabled:opacity-60"
        >
          <ChevronDown className="size-4" />
        </ComboboxButton>
      </div>
      <ComboboxOptions
        anchor="bottom start"
        transition
        className="z-50 max-h-72 w-(--input-width) overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg transition-opacity duration-100 [--anchor-gap:6px] empty:invisible data-closed:opacity-0"
      >
        {sorted.map((c) => (
          <ComboboxOption
            key={c}
            value={c}
            className="group flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 text-[15px] data-focus:bg-muted data-selected:font-bold"
          >
            {c}
            <Check className="invisible size-4 text-brand group-data-selected:visible" />
          </ComboboxOption>
        ))}
        {typed.length >= 2 && !exact ? (
          <ComboboxOption
            value={typed}
            className="flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-[15px] text-fg-muted data-focus:bg-muted"
          >
            {sorted.length ? "Not listed? " : "Town not in our list? "}Deliver to “{typed}”
          </ComboboxOption>
        ) : null}
      </ComboboxOptions>
    </Combobox>
  );
}
