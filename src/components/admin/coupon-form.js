"use client";

import { startTransition, useActionState, useId, useState, useTransition } from "react";
import { deleteCoupon, saveCoupon, setCouponActive } from "@/actions/admin/coupons";
import { ErrorSummary } from "@/components/admin/error-summary";
import { ScopePicker } from "@/components/admin/scope-picker";
import { VoucherSocialPost } from "@/components/admin/promo-social-post";
import { toPktInput } from "@/lib/pkt";
import { AlertCircle, Sparkle, Trash } from "@/components/ui/icons";

const field =
  "min-h-11 w-full rounded-xl border border-field bg-surface px-3.5 text-sm text-fg aria-invalid:border-sale";
const label = "mb-1.5 block text-[13px] font-bold";
const card = "rounded-2xl border border-line bg-surface p-5 sm:p-6";

const LABELS = {
  code: "Code",
  description: "Description",
  type: "Discount type",
  value: "Discount",
  minOrderAmount: "Minimum spend",
  maxDiscountAmount: "Maximum discount",
  usageLimit: "Total uses",
  usageLimitPerUser: "Uses per customer",
  startsAt: "Starts",
  endsAt: "Ends",
  scope: "Applies to",
};
const TYPES = [
  ["PERCENTAGE", "Percentage", "e.g. 10% off"],
  ["FIXED_AMOUNT", "Fixed amount", "e.g. Rs 500 off"],
  ["FREE_SHIPPING", "Free delivery", "Delivery charge waived"],
];

/** Readable, unambiguous code (no 0/O, 1/I/L). */
function randomCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `HZ${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

/** Create / edit a voucher. `coupon` is null when creating. */
export function CouponForm({ coupon, scopeOptions, social }) {
  const uid = useId();
  const [state, action, saving] = useActionState(saveCoupon, null);
  const errors = state?.ok === false ? (state.errors ?? {}) : {};
  const [type, setType] = useState(coupon?.type ?? "PERCENTAGE");
  const [code, setCode] = useState(coupon?.code ?? "");
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

  const onSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <input type="hidden" name="id" value={coupon?.id ?? ""} />
      <div className="grid content-start gap-5">
        {state?.ok === false ? (
          <ErrorSummary
            message={state.message}
            errors={errors}
            labels={LABELS}
            targetFor={(k) => (k === "scope" ? `${uid}-scope` : k === "type" ? id("type-PERCENTAGE") : id(k))}
          />
        ) : null}

        <section className={card} aria-labelledby={id("code-h")}>
          <h2 id={id("code-h")} className="mb-4 font-extrabold">
            Voucher code
          </h2>
          <div className="grid gap-4">
            <div>
              <label htmlFor={id("code")} className={label}>
                Code <span className="font-normal text-fg-muted">· customers type this at checkout</span>
              </label>
              <div className="flex gap-2">
                <input
                  id={id("code")}
                  name="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                  maxLength={40}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="EID25"
                  className={`${field} font-mono tracking-wider uppercase`}
                  {...err("code")}
                />
                <button type="button" onClick={() => setCode(randomCode())} className="btn-outline min-h-11 shrink-0">
                  <Sparkle className="size-4" /> Generate
                </button>
              </div>
              {errText("code")}
            </div>
            <div>
              <label htmlFor={id("description")} className={label}>
                Description <span className="font-normal text-fg-muted">· optional, shown at checkout</span>
              </label>
              <input
                id={id("description")}
                name="description"
                defaultValue={coupon?.description ?? ""}
                maxLength={255}
                placeholder="Eid special: 25% off all formal shoes"
                className={field}
                {...err("description")}
              />
              {errText("description")}
            </div>
          </div>
        </section>

        <section className={card} aria-labelledby={id("disc-h")}>
          <h2 id={id("disc-h")} className="mb-4 font-extrabold">
            Discount
          </h2>
          <fieldset>
            <legend className="sr-only">Discount type</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {TYPES.map(([value, title, hint]) => (
                <label
                  key={value}
                  className="flex cursor-pointer gap-3 rounded-xl border border-line p-3.5 has-checked:border-fg has-checked:bg-muted"
                >
                  <input
                    id={id(`type-${value}`)}
                    type="radio"
                    name="type"
                    value={value}
                    checked={type === value}
                    onChange={() => setType(value)}
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
            {type !== "FREE_SHIPPING" ? (
              <div>
                <label htmlFor={id("value")} className={label}>
                  {type === "PERCENTAGE" ? "Percentage off" : "Amount off (Rs)"}
                </label>
                <div className="relative">
                  <input
                    id={id("value")}
                    name="value"
                    inputMode="decimal"
                    defaultValue={coupon && coupon.type !== "FREE_SHIPPING" ? String(Number(coupon.value)) : ""}
                    placeholder={type === "PERCENTAGE" ? "10" : "500"}
                    className={`${field} pr-12`}
                    {...err("value")}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-bold text-fg-muted">
                    {type === "PERCENTAGE" ? "%" : "Rs"}
                  </span>
                </div>
                {errText("value")}
              </div>
            ) : null}
            {type === "PERCENTAGE" ? (
              <div>
                <label htmlFor={id("maxDiscountAmount")} className={label}>
                  Maximum discount (Rs) <span className="font-normal text-fg-muted">· optional</span>
                </label>
                <input
                  id={id("maxDiscountAmount")}
                  name="maxDiscountAmount"
                  inputMode="decimal"
                  defaultValue={coupon?.maxDiscountAmount ? String(Number(coupon.maxDiscountAmount)) : ""}
                  placeholder="No cap"
                  className={field}
                  {...err("maxDiscountAmount")}
                />
                {errText("maxDiscountAmount")}
              </div>
            ) : null}
            <div>
              <label htmlFor={id("minOrderAmount")} className={label}>
                Minimum spend (Rs) <span className="font-normal text-fg-muted">· optional</span>
              </label>
              <input
                id={id("minOrderAmount")}
                name="minOrderAmount"
                inputMode="decimal"
                defaultValue={coupon?.minOrderAmount ? String(Number(coupon.minOrderAmount)) : ""}
                placeholder="No minimum"
                className={field}
                aria-describedby={errors.minOrderAmount ? `${id("minOrderAmount")}-err` : `${id("min-hint")}`}
                aria-invalid={errors.minOrderAmount ? true : undefined}
              />
              <p id={id("min-hint")} className="mt-1 text-[12px] text-fg-muted">
                Counts only the items the voucher applies to.
              </p>
              {errText("minOrderAmount")}
            </div>
          </div>
        </section>

        <section className={card}>
          <ScopePicker
            idPrefix={uid}
            options={scopeOptions}
            error={errors.scope}
            initial={{
              appliesToAll: coupon?.appliesToAll ?? true,
              productIds: coupon?.productIds ?? [],
              categoryIds: coupon?.categoryIds ?? [],
              brandIds: coupon?.brandIds ?? [],
            }}
          />
        </section>

        <section className={card} aria-labelledby={id("lim-h")}>
          <h2 id={id("lim-h")} className="mb-4 font-extrabold">
            Limits
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={id("usageLimit")} className={label}>
                Total uses <span className="font-normal text-fg-muted">· optional</span>
              </label>
              <input
                id={id("usageLimit")}
                name="usageLimit"
                inputMode="numeric"
                defaultValue={coupon?.usageLimit ?? ""}
                placeholder="Unlimited"
                className={field}
                {...err("usageLimit")}
              />
              {errText("usageLimit")}
            </div>
            <div>
              <label htmlFor={id("usageLimitPerUser")} className={label}>
                Uses per customer <span className="font-normal text-fg-muted">· by email or account</span>
              </label>
              <input
                id={id("usageLimitPerUser")}
                name="usageLimitPerUser"
                inputMode="numeric"
                defaultValue={coupon ? (coupon.usageLimitPerUser ?? "") : 1}
                placeholder="Unlimited"
                className={field}
                {...err("usageLimitPerUser")}
              />
              {errText("usageLimitPerUser")}
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="firstOrderOnly"
              defaultChecked={coupon?.firstOrderOnly ?? false}
              className="mt-0.5 size-4 accent-current"
            />
            <span className="text-sm">
              <span className="font-bold">First order only</span>
              <span className="block text-[13px] text-fg-muted">For customers who haven&apos;t ordered before.</span>
            </span>
          </label>
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
              defaultChecked={coupon?.isActive ?? true}
              className="mt-0.5 size-4 accent-current"
            />
            <span className="text-sm">
              <span className="font-bold">Active</span>
              <span className="block text-[13px] text-fg-muted">Switch off to pause it without deleting.</span>
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
                defaultValue={toPktInput(coupon?.startsAt)}
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
                defaultValue={toPktInput(coupon?.endsAt)}
                className={field}
                {...err("endsAt")}
              />
              {errText("endsAt")}
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary mt-5 min-h-12 w-full">
            {saving ? "Saving…" : coupon ? "Save changes" : "Create voucher"}
          </button>
        </section>

        {coupon ? (
          <section className={card} aria-labelledby={id("more-h")}>
            <h2 id={id("more-h")} className="mb-3 font-extrabold">
              More
            </h2>
            <div className="grid gap-2">
              {social ? <VoucherSocialPost coupon={coupon} social={social} /> : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => startBusy(async () => setSideMsg(await setCouponActive(coupon.id, !coupon.isActive)))}
                className="btn-outline min-h-11 w-full"
              >
                {coupon.isActive ? "Switch off now" : "Switch on now"}
              </button>
              {coupon.redeemed === 0 ? (
                confirmDelete ? (
                  <div className="grid gap-2 rounded-xl bg-danger-bg p-3">
                    <p className="text-[13px] font-semibold text-sale">Delete {coupon.code} permanently?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => startBusy(async () => setSideMsg(await deleteCoupon(coupon.id)))}
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
                    <Trash className="size-4" /> Delete voucher
                  </button>
                )
              ) : (
                <p className="text-[13px] text-fg-muted">
                  Used vouchers can&apos;t be deleted; switch them off instead.
                </p>
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
