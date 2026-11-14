"use client";

import { startTransition, useActionState, useId, useState, useTransition } from "react";
import { deleteTaxRate, saveTaxRate } from "@/actions/admin/settings";
import { card, field, FieldError, labelCls } from "@/components/admin/settings-forms";
import { AlertCircle, Check, Plus, Trash } from "@/components/ui/icons";

/** Tax rates: a nationwide rate plus optional province-specific ones (most specific wins). */
export function TaxRates({ rates, provinces }) {
  const [adding, setAdding] = useState(!rates.length);
  return (
    <section className={card} aria-labelledby="tax-rates-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="tax-rates-h" className="font-extrabold">
            GST rates
          </h2>
          <p className="mt-1 text-[13px] text-fg-muted">
            A province rate replaces the nationwide rate for addresses in that province.
          </p>
        </div>
        {!adding ? (
          <button type="button" onClick={() => setAdding(true)} className="btn-outline min-h-11">
            <Plus className="size-4" /> Add rate
          </button>
        ) : null}
      </div>
      <ul className="mt-5 grid gap-3">
        {rates.map((r) => (
          <li key={r.id}>
            <RateForm rate={r} provinces={provinces} />
          </li>
        ))}
        {adding ? (
          <li>
            <RateForm rate={null} provinces={provinces} onDone={() => setAdding(false)} />
          </li>
        ) : null}
      </ul>
      {!rates.length && !adding ? <p className="mt-4 text-sm text-fg-muted">No GST is charged.</p> : null}
    </section>
  );
}

function RateForm({ rate, provinces, onDone }) {
  const uid = useId();
  const [state, run, pending] = useActionState(async (prev, fd) => {
    const res = await saveTaxRate(prev, fd);
    if (res.ok && !rate) onDone?.();
    return res;
  }, null);
  const [removing, startRemove] = useTransition();
  const [removeMsg, setRemoveMsg] = useState(null);
  const e = state?.ok === false ? (state.errors ?? {}) : {};

  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => run(fd));
      }}
      noValidate
      className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1.2fr_0.7fr_1.3fr_auto] sm:items-end"
    >
      <input type="hidden" name="id" value={rate?.id ?? ""} />
      <input type="hidden" name="priority" value={rate?.priority ?? 0} />
      <div>
        <label htmlFor={`${uid}-n`} className={labelCls}>
          Name
        </label>
        <input
          id={`${uid}-n`}
          name="name"
          defaultValue={rate?.name ?? "GST"}
          maxLength={80}
          className={field}
          aria-invalid={e.name ? true : undefined}
        />
        {e.name ? <FieldError id={`${uid}-n-err`} text={e.name} /> : null}
      </div>
      <div>
        <label htmlFor={`${uid}-r`} className={labelCls}>
          Rate (%)
        </label>
        <input
          id={`${uid}-r`}
          name="rate"
          inputMode="decimal"
          defaultValue={rate ? String(Number(rate.rate)) : "18"}
          className={field}
          aria-invalid={e.rate ? true : undefined}
        />
        {e.rate ? <FieldError id={`${uid}-r-err`} text={e.rate} /> : null}
      </div>
      <div>
        <label htmlFor={`${uid}-p`} className={labelCls}>
          Applies to
        </label>
        <select id={`${uid}-p`} name="province" defaultValue={rate?.province ?? ""} className={field}>
          <option value="">All of Pakistan</option>
          {Object.entries(provinces).map(([k, n]) => (
            <option key={k} value={k}>
              {n} only
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={rate?.isActive ?? true}
            className="size-4 accent-current"
          />
          On
        </label>
        <button type="submit" disabled={pending} className="btn-ink min-h-11">
          {pending ? "Saving…" : rate ? "Save" : "Add"}
        </button>
        {rate ? (
          <button
            type="button"
            disabled={removing}
            onClick={() => startRemove(async () => setRemoveMsg(await deleteTaxRate(rate.id)))}
            aria-label={`Remove ${rate.name} rate`}
            className="grid size-11 place-items-center rounded-full text-sale hover:bg-danger-bg"
          >
            <Trash className="size-4" />
          </button>
        ) : (
          <button type="button" onClick={onDone} className="btn-ghost min-h-11">
            Cancel
          </button>
        )}
      </div>
      {state?.message || removeMsg?.message ? (
        <p
          role="status"
          className={`flex items-center gap-1.5 text-[13px] font-semibold sm:col-span-4 ${(removeMsg ?? state).ok ? "text-success" : "text-sale"}`}
        >
          {(removeMsg ?? state).ok ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
          {(removeMsg ?? state).message}
        </p>
      ) : null}
    </form>
  );
}
