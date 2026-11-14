"use client";

import { useId, useState, useTransition } from "react";
import { deleteDeliveryZone, saveDeliveryZone } from "@/actions/admin/settings";
import { card, field, FieldError, labelCls } from "@/components/admin/settings-forms";
import { CITIES_BY_PROVINCE } from "@/lib/pk-cities";
import { formatPKR } from "@/lib/money";
import { AlertCircle, Check, Close, Plus, Trash } from "@/components/ui/icons";

const ALL_CITIES = [...new Set(Object.values(CITIES_BY_PROVINCE).flat())].sort((a, b) => a.localeCompare(b));
const title = (c) => c.replace(/\b\w/g, (x) => x.toUpperCase());
const num = (v) => (v == null || v === "" ? "" : String(Number(v)));

const blankRate = () => ({
  key: crypto.randomUUID(),
  id: "",
  name: "Standard",
  price: "250",
  codFee: "",
  freeAboveAmount: "",
  minOrderAmount: "",
  estimatedDaysMin: "2",
  estimatedDaysMax: "4",
  isActive: true,
});

/** Delivery zones: which addresses they cover and their rates. City match beats province, which beats the default zone. */
export function DeliveryZones({ zones, provinces }) {
  const [editing, setEditing] = useState(null); // zone id | "new" | null
  const [msg, setMsg] = useState(null);
  const [busy, start] = useTransition();
  const hasDefault = zones.some((z) => z.isDefault);

  return (
    <section className={card} aria-labelledby="zones-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="zones-h" className="font-extrabold">
            Delivery zones and rates
          </h2>
          <p className="mt-1 max-w-xl text-[13px] text-fg-muted">
            Checkout uses the most specific zone: a city match first, then the province, then the default zone for the
            rest of Pakistan.
          </p>
        </div>
        {editing !== "new" ? (
          <button type="button" onClick={() => setEditing("new")} className="btn-outline min-h-11">
            <Plus className="size-4" /> Add zone
          </button>
        ) : null}
      </div>
      {!hasDefault ? (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-warning-bg p-3 text-[13px] font-semibold text-warning">
          <AlertCircle className="size-4 shrink-0" />
          No default zone: addresses outside your zones get no delivery option at checkout.
        </p>
      ) : null}
      {msg ? (
        <p role="status" className={`mt-4 text-[13px] font-semibold ${msg.ok ? "text-success" : "text-sale"}`}>
          {msg.message}
        </p>
      ) : null}

      <ul className="mt-5 grid gap-3">
        {editing === "new" ? (
          <li>
            <ZoneEditor
              zone={null}
              provinces={provinces}
              onCancel={() => setEditing(null)}
              onSaved={(m) => {
                setEditing(null);
                setMsg(m);
              }}
            />
          </li>
        ) : null}
        {zones.map((z) =>
          editing === z.id ? (
            <li key={z.id}>
              <ZoneEditor
                zone={z}
                provinces={provinces}
                onCancel={() => setEditing(null)}
                onSaved={(m) => {
                  setEditing(null);
                  setMsg(m);
                }}
              />
            </li>
          ) : (
            <li key={z.id} className={`rounded-xl border border-line p-4 ${z.isActive ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">
                    {z.name}
                    {z.isDefault ? (
                      <span className="ml-2 rounded-full bg-info-bg px-2 py-0.5 text-[11px] font-bold text-info">
                        Default
                      </span>
                    ) : null}
                    {!z.isActive ? (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-fg-muted">
                        Off
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[13px] text-fg-muted">
                    {z.isDefault && !z.cities.length && !z.provinces.length
                      ? "Everywhere not covered by another zone"
                      : [
                          z.cities.length
                            ? `${z.cities.slice(0, 6).map(title).join(", ")}${z.cities.length > 6 ? ` +${z.cities.length - 6} more` : ""}`
                            : null,
                          z.provinces.length ? z.provinces.map((p) => provinces[p]).join(", ") : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditing(z.id)} className="btn-outline min-h-10 text-sm">
                    Edit
                  </button>
                  {!z.isDefault ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm(`Remove the zone "${z.name}" and its rates?`)) return;
                        start(async () => setMsg(await deleteDeliveryZone(z.id)));
                      }}
                      aria-label={`Remove zone ${z.name}`}
                      className="grid size-10 place-items-center rounded-full text-sale hover:bg-danger-bg"
                    >
                      <Trash className="size-4" />
                    </button>
                  ) : null}
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-2">
                {z.rates.map((r) => (
                  <li
                    key={r.id}
                    className={`rounded-lg bg-muted px-3 py-1.5 text-[13px] ${r.isActive ? "" : "line-through opacity-60"}`}
                  >
                    <span className="font-bold">{r.name}</span> {Number(r.price) ? formatPKR(r.price) : "Free"}
                    {r.estimatedDaysMax ? ` · ${r.estimatedDaysMin ?? ""}–${r.estimatedDaysMax} days` : ""}
                    {Number(r.codFee) ? ` · COD +${formatPKR(r.codFee)}` : ""}
                    {r.freeAboveAmount ? ` · free over ${formatPKR(r.freeAboveAmount)}` : ""}
                  </li>
                ))}
              </ul>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

function ZoneEditor({ zone, provinces, onCancel, onSaved }) {
  const uid = useId();
  const [name, setName] = useState(zone?.name ?? "");
  const [picked, setPicked] = useState(zone?.provinces ?? []);
  const [cities, setCities] = useState(zone?.cities ?? []);
  const [cityInput, setCityInput] = useState("");
  const [isDefault, setIsDefault] = useState(zone?.isDefault ?? false);
  const [isActive, setIsActive] = useState(zone?.isActive ?? true);
  const [sortOrder, setSortOrder] = useState(zone?.sortOrder ?? 0);
  const [rates, setRates] = useState(
    zone?.rates.length
      ? zone.rates.map((r) => ({
          key: r.id,
          id: r.id,
          name: r.name,
          price: num(r.price),
          codFee: num(r.codFee),
          freeAboveAmount: num(r.freeAboveAmount),
          minOrderAmount: num(r.minOrderAmount),
          estimatedDaysMin: r.estimatedDaysMin ?? "",
          estimatedDaysMax: r.estimatedDaysMax ?? "",
          isActive: r.isActive,
        }))
      : [blankRate()],
  );
  const [saving, start] = useTransition();
  const [result, setResult] = useState(null);
  const e = result?.ok === false ? (result.errors ?? {}) : {};

  const addCity = () => {
    const c = cityInput.trim().toLowerCase();
    if (c.length >= 2 && !cities.includes(c)) setCities([...cities, c]);
    setCityInput("");
  };
  const setRate = (key, k, v) => setRates((list) => list.map((r) => (r.key === key ? { ...r, [k]: v } : r)));

  function save() {
    start(async () => {
      const res = await saveDeliveryZone({
        id: zone?.id ?? "",
        name,
        provinces: picked,
        cities,
        isDefault,
        sortOrder,
        isActive,
        rates: rates.map(({ key: _k, ...r }) => ({
          ...r,
          estimatedDaysMin: String(r.estimatedDaysMin),
          estimatedDaysMax: String(r.estimatedDaysMax),
        })),
      });
      if (res.ok) onSaved(res);
      else setResult(res);
    });
  }

  return (
    <div className="grid gap-5 rounded-xl border-2 border-fg p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-extrabold">{zone ? `Edit ${zone.name}` : "New zone"}</p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close without saving"
          className="grid size-9 place-items-center rounded-full hover:bg-muted"
        >
          <Close className="size-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <div>
          <label htmlFor={`${uid}-name`} className={labelCls}>
            Zone name
          </label>
          <input
            id={`${uid}-name`}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            maxLength={80}
            placeholder="e.g. Lahore & Islamabad"
            className={field}
            aria-invalid={e.name ? true : undefined}
          />
          {e.name ? <FieldError id={`${uid}-name-err`} text={e.name} /> : null}
        </div>
        <div>
          <label htmlFor={`${uid}-order`} className={labelCls}>
            Order
          </label>
          <input
            id={`${uid}-order`}
            type="number"
            min={0}
            max={1000}
            value={sortOrder}
            onChange={(ev) => setSortOrder(Number(ev.target.value) || 0)}
            className={field}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(ev) => setIsDefault(ev.target.checked)}
            className="size-4 accent-current"
          />
          Default zone (rest of Pakistan)
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(ev) => setIsActive(ev.target.checked)}
            className="size-4 accent-current"
          />
          Active
        </label>
      </div>

      <fieldset>
        <legend className={labelCls}>Provinces {isDefault ? "(optional for the default zone)" : ""}</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(provinces).map(([k, n]) => (
            <label
              key={k}
              className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line px-3.5 text-[13px] font-semibold has-checked:border-fg has-checked:bg-fg has-checked:text-bg has-focus-visible:outline-2 has-focus-visible:outline-ring"
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={picked.includes(k)}
                onChange={() => setPicked(picked.includes(k) ? picked.filter((x) => x !== k) : [...picked, k])}
              />
              {n}
            </label>
          ))}
        </div>
        {e.provinces ? <FieldError id={`${uid}-prov-err`} text={e.provinces} /> : null}
      </fieldset>

      <div>
        <label htmlFor={`${uid}-city`} className={labelCls}>
          Cities <span className="font-normal text-fg-muted">· beat the province rules</span>
        </label>
        <div className="flex gap-2">
          <input
            id={`${uid}-city`}
            list={`${uid}-cities`}
            value={cityInput}
            onChange={(ev) => setCityInput(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") {
                ev.preventDefault();
                addCity();
              }
            }}
            placeholder="Type a city and press Enter"
            className={field}
          />
          <datalist id={`${uid}-cities`}>
            {ALL_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button type="button" onClick={addCity} className="btn-outline min-h-11">
            Add
          </button>
        </div>
        {cities.length ? (
          <ul className="mt-2 flex flex-wrap gap-2" aria-label="Cities in this zone">
            {cities.map((c) => (
              <li
                key={c}
                className="inline-flex min-h-9 items-center gap-1 rounded-full bg-muted pr-1 pl-3 text-[13px] font-semibold"
              >
                {title(c)}
                <button
                  type="button"
                  onClick={() => setCities(cities.filter((x) => x !== c))}
                  aria-label={`Remove ${title(c)}`}
                  className="grid size-7 place-items-center rounded-full hover:bg-surface"
                >
                  <Close className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <fieldset>
        <legend className={labelCls}>Rates</legend>
        <div className="grid gap-3">
          {rates.map((r, i) => (
            <div key={r.key} className="grid gap-3 rounded-xl bg-muted p-3 sm:grid-cols-4">
              {[
                ["name", "Name", "text", "Standard"],
                ["price", "Price (Rs)", "decimal", "250"],
                ["codFee", "COD fee (Rs)", "decimal", "0"],
                ["freeAboveAmount", "Free over (Rs)", "decimal", "Never"],
                ["minOrderAmount", "Min order (Rs)", "decimal", "None"],
                ["estimatedDaysMin", "Days from", "numeric", "2"],
                ["estimatedDaysMax", "Days to", "numeric", "4"],
              ].map(([k, l, mode, ph]) => {
                const err = e[`rates.${i}.${k}`];
                return (
                  <div key={k}>
                    <label htmlFor={`${uid}-${r.key}-${k}`} className="mb-1 block text-[12px] font-bold">
                      {l}
                    </label>
                    <input
                      id={`${uid}-${r.key}-${k}`}
                      inputMode={mode === "text" ? undefined : mode}
                      value={r[k]}
                      onChange={(ev) => setRate(r.key, k, ev.target.value)}
                      placeholder={ph}
                      className={`${field} bg-surface`}
                      aria-invalid={err ? true : undefined}
                    />
                    {err ? <FieldError id={`${uid}-${r.key}-${k}-err`} text={err} /> : null}
                  </div>
                );
              })}
              <div className="flex items-end justify-between gap-2">
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={r.isActive}
                    onChange={(ev) => setRate(r.key, "isActive", ev.target.checked)}
                    className="size-4 accent-current"
                  />
                  On
                </label>
                <button
                  type="button"
                  onClick={() => setRates(rates.filter((x) => x.key !== r.key))}
                  disabled={rates.length === 1}
                  aria-label={`Remove rate ${r.name || i + 1}`}
                  className="grid size-11 place-items-center rounded-full text-sale hover:bg-danger-bg disabled:opacity-30"
                >
                  <Trash className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            setRates([
              ...rates,
              { ...blankRate(), name: "Express", price: "450", estimatedDaysMin: "1", estimatedDaysMax: "2" },
            ])
          }
          className="btn-ghost mt-2 min-h-10 text-sm"
          disabled={rates.length >= 10}
        >
          <Plus className="size-4" /> Add rate
        </button>
        {e.rates ? <FieldError id={`${uid}-rates-err`} text={e.rates} /> : null}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="btn-ink min-h-11">
          {saving ? "Saving…" : zone ? "Save zone" : "Add zone"}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost min-h-11">
          Cancel
        </button>
        {result?.ok === false ? (
          <p role="alert" className="flex items-center gap-1.5 text-[13px] font-semibold text-sale">
            <AlertCircle className="size-4" />
            {result.message ?? "Please fix the highlighted fields."}
          </p>
        ) : result?.ok ? (
          <p role="status" className="flex items-center gap-1.5 text-[13px] font-semibold text-success">
            <Check className="size-4" /> {result.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
