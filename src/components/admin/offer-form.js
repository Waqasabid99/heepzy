"use client";

import { startTransition, useActionState, useId, useState, useTransition } from "react";
import { deleteOffer, saveOffer, setOfferActive } from "@/actions/admin/promotions";
import { ErrorSummary } from "@/components/admin/error-summary";
import { ScopePicker } from "@/components/admin/scope-picker";
import { OfferSocialPost } from "@/components/admin/promo-social-post";
import { slugify } from "@/lib/slug";
import { toPktInput } from "@/lib/pkt";
import { formatPKR } from "@/lib/money";
import { AlertCircle, ExternalLink, Trash } from "@/components/ui/icons";

const field =
  "min-h-11 w-full rounded-xl border border-field bg-surface px-3.5 text-sm text-fg aria-invalid:border-sale";
const label = "mb-1.5 block text-[13px] font-bold";
const card = "rounded-2xl border border-line bg-surface p-5 sm:p-6";

const LABELS = {
  name: "Name",
  slug: "Link",
  description: "Description",
  type: "Discount type",
  value: "Discount",
  priority: "Priority",
  startsAt: "Starts",
  endsAt: "Ends",
  scope: "Applies to",
};

/** Same rounding as the storefront (src/lib/pricing.js). */
function example(price, type, value) {
  const v = Number(value);
  if (!(v > 0)) return null;
  const off = type === "PERCENTAGE" ? (price * v) / 100 : v;
  return Math.max(1, Math.round(price - off));
}

/** Create / edit an offer. `offer` is null when creating. */
export function OfferForm({ offer, scopeOptions, social }) {
  const uid = useId();
  const [state, action, saving] = useActionState(saveOffer, null);
  const errors = state?.ok === false ? (state.errors ?? {}) : {};
  const [type, setType] = useState(offer?.type ?? "PERCENTAGE");
  const [value, setValue] = useState(offer ? String(Number(offer.value)) : "");
  const [name, setName] = useState(offer?.name ?? "");
  const [busy, startBusy] = useTransition();
  const [sideMsg, setSideMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const id = (k) => `${uid}-${k}`;
  const err = (k) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${id(k)}-err` } : {});
  const errText = (k) =>
    errors[k] ? (
      <p id={`${id(k)}-err`} className="mt-1 flex items-start gap-1 text-[13px] font-semibold text-sale">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
        {errors[k]}
      </p>
    ) : null;
  const sample = example(5000, type, value);

  const onSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <input type="hidden" name="id" value={offer?.id ?? ""} />
      <div className="grid content-start gap-5">
        {state?.ok === false ? (
          <ErrorSummary
            message={state.message}
            errors={errors}
            labels={LABELS}
            targetFor={(k) => (k === "scope" ? `${uid}-scope` : k === "type" ? id("type-PERCENTAGE") : id(k))}
          />
        ) : null}

        <section className={card} aria-labelledby={id("about-h")}>
          <h2 id={id("about-h")} className="mb-4 font-extrabold">
            About the offer
          </h2>
          <div className="grid gap-4">
            <div>
              <label htmlFor={id("name")} className={label}>
                Name <span className="font-normal text-fg-muted">· shown on the store</span>
              </label>
              <input
                id={id("name")}
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                placeholder="Eid Sale"
                className={field}
                {...err("name")}
              />
              {errText("name")}
            </div>
            <div>
              <label htmlFor={id("description")} className={label}>
                Short description <span className="font-normal text-fg-muted">· optional</span>
              </label>
              <textarea
                id={id("description")}
                name="description"
                defaultValue={offer?.description ?? ""}
                maxLength={500}
                rows={2}
                placeholder="Up to 30% off khussa and formal shoes, this weekend only."
                className={`${field} py-2.5`}
                {...err("description")}
              />
              {errText("description")}
            </div>
            <div>
              <label htmlFor={id("slug")} className={label}>
                Link <span className="font-normal text-fg-muted">· leave empty to build it from the name</span>
              </label>
              <div className="flex items-center rounded-xl border border-field bg-surface focus-within:outline-2 focus-within:outline-offset-2">
                <span className="pl-3.5 text-sm whitespace-nowrap text-fg-muted">/products?offer=</span>
                <input
                  id={id("slug")}
                  name="slug"
                  defaultValue={offer?.slug ?? ""}
                  maxLength={140}
                  placeholder={slugify(name) || "eid-sale"}
                  className="min-h-11 w-full min-w-0 rounded-r-xl bg-transparent pr-3.5 text-sm outline-none"
                  {...err("slug")}
                />
              </div>
              {errText("slug")}
            </div>
          </div>
        </section>

        <section className={card} aria-labelledby={id("disc-h")}>
          <h2 id={id("disc-h")} className="mb-4 font-extrabold">
            Discount
          </h2>
          <fieldset>
            <legend className="sr-only">Discount type</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                ["PERCENTAGE", "Percentage off", "e.g. 20% off each pair"],
                ["FIXED_AMOUNT", "Amount off", "e.g. Rs 500 off each pair"],
              ].map(([v, title, hint]) => (
                <label
                  key={v}
                  className="flex cursor-pointer gap-3 rounded-xl border border-line p-3.5 has-checked:border-fg has-checked:bg-muted"
                >
                  <input
                    id={id(`type-${v}`)}
                    type="radio"
                    name="type"
                    value={v}
                    checked={type === v}
                    onChange={() => setType(v)}
                    className="mt-0.5 size-4 accent-current"
                  />
                  <span>
                    <span className="block text-sm font-bold">{title}</span>
                    <span className="block text-[13px] text-fg-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={id("value")} className={label}>
                {type === "PERCENTAGE" ? "Percentage off" : "Amount off each pair (Rs)"}
              </label>
              <div className="relative">
                <input
                  id={id("value")}
                  name="value"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === "PERCENTAGE" ? "20" : "500"}
                  className={`${field} pr-12`}
                  {...err("value")}
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-bold text-fg-muted">
                  {type === "PERCENTAGE" ? "%" : "Rs"}
                </span>
              </div>
              {errText("value")}
            </div>
            <div className="rounded-xl bg-muted p-3.5 text-sm" aria-live="polite">
              <p className="text-[13px] font-bold text-fg-muted">Example</p>
              {sample ? (
                <p className="mt-1">
                  A {formatPKR(5000)} pair sells for{" "}
                  <span className="font-extrabold text-brand">{formatPKR(sample)}</span>
                </p>
              ) : (
                <p className="mt-1 text-fg-muted">Enter a discount to see a sample price.</p>
              )}
            </div>
          </div>
          <p className="mt-3 text-[13px] text-fg-muted">
            Prices are rounded to whole rupees. Vouchers still apply on top of offer prices at checkout.
          </p>
        </section>

        <section className={card}>
          <ScopePicker
            idPrefix={uid}
            options={scopeOptions}
            error={errors.scope}
            noun="This offer"
            initial={{
              appliesToAll: offer?.appliesToAll ?? false,
              productIds: offer?.productIds ?? [],
              categoryIds: offer?.categoryIds ?? [],
              brandIds: offer?.brandIds ?? [],
            }}
          />
        </section>
      </div>

      <aside className="grid content-start gap-4 lg:sticky lg:top-6 lg:self-start">
        <section className={card} aria-labelledby={id("pub-h")}>
          <h2 id={id("pub-h")} className="mb-4 font-extrabold">
            Status and schedule
          </h2>
          <label className="mb-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={offer?.isActive ?? true}
              className="mt-0.5 size-4 accent-current"
            />
            <span className="text-sm">
              <span className="font-bold">Active</span>
              <span className="block text-[13px] text-fg-muted">
                Runs between the dates below, or right away if none.
              </span>
            </span>
          </label>
          <div className="grid gap-3">
            <div>
              <label htmlFor={id("startsAt")} className={label}>
                Starts <span className="font-normal text-fg-muted">· Pakistan time, optional</span>
              </label>
              <input
                id={id("startsAt")}
                name="startsAt"
                type="datetime-local"
                defaultValue={toPktInput(offer?.startsAt)}
                className={field}
                {...err("startsAt")}
              />
              {errText("startsAt")}
            </div>
            <div>
              <label htmlFor={id("endsAt")} className={label}>
                Ends <span className="font-normal text-fg-muted">· optional</span>
              </label>
              <input
                id={id("endsAt")}
                name="endsAt"
                type="datetime-local"
                defaultValue={toPktInput(offer?.endsAt)}
                className={field}
                {...err("endsAt")}
              />
              {errText("endsAt")}
            </div>
            <div>
              <label htmlFor={id("priority")} className={label}>
                Priority <span className="font-normal text-fg-muted">· 0–100</span>
              </label>
              <input
                id={id("priority")}
                name="priority"
                inputMode="numeric"
                defaultValue={offer?.priority ?? 0}
                className={field}
                aria-describedby={errors.priority ? `${id("priority")}-err` : id("prio-hint")}
                aria-invalid={errors.priority ? true : undefined}
              />
              <p id={id("prio-hint")} className="mt-1 text-[12px] text-fg-muted">
                If two offers cover the same shoe, the higher priority wins; on a tie, the bigger saving.
              </p>
              {errText("priority")}
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary mt-5 min-h-12 w-full">
            {saving ? "Saving…" : offer ? "Save changes" : "Create offer"}
          </button>
        </section>

        {offer ? (
          <section className={card} aria-labelledby={id("more-h")}>
            <h2 id={id("more-h")} className="mb-3 font-extrabold">
              More
            </h2>
            <div className="grid gap-2">
              {social ? <OfferSocialPost offer={offer} social={social} /> : null}
              {offer.state === "active" ? (
                <a
                  href={`/products?offer=${offer.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline min-h-11 w-full"
                >
                  View on store <ExternalLink className="size-4" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => startBusy(async () => setSideMsg(await setOfferActive(offer.id, !offer.isActive)))}
                className="btn-outline min-h-11 w-full"
              >
                {offer.isActive ? "Switch off now" : "Switch on now"}
              </button>
              {confirmDelete ? (
                <div className="grid gap-2 rounded-xl bg-danger-bg p-3">
                  <p className="text-[13px] font-semibold text-sale">
                    Delete “{offer.name}”? Prices go back to normal straight away.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => startBusy(async () => setSideMsg(await deleteOffer(offer.id)))}
                      className="btn min-h-10 flex-1 bg-sale text-sm text-white hover:opacity-90"
                    >
                      Yes, delete
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(false)} className="btn-ghost min-h-10">
                      Keep
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="btn-ghost min-h-10 w-full text-sm text-sale"
                >
                  <Trash className="size-4" /> Delete offer
                </button>
              )}
              {sideMsg?.message ? (
                <p role="status" className={`text-[13px] font-semibold ${sideMsg.ok ? "text-success" : "text-sale"}`}>
                  {sideMsg.message}
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </aside>
    </form>
  );
}
