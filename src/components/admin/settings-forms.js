"use client";

import { startTransition, useActionState, useId, useState } from "react";
import {
  saveFreeDelivery,
  savePaymentSettings,
  saveReturnSettings,
  saveStoreSettings,
  saveTaxMode,
} from "@/actions/admin/settings";
import { formatPhone } from "@/lib/phone";
import { AlertCircle, Check } from "@/components/ui/icons";

export const field =
  "min-h-11 w-full rounded-xl border border-field bg-surface px-3.5 text-sm text-fg aria-invalid:border-sale";
export const labelCls = "mb-1.5 block text-[13px] font-bold";
export const card = "rounded-2xl border border-line bg-surface p-5 sm:p-6";

/** A settings card whose form saves through `action` (useActionState-compatible). */
function SettingsForm({ title, description, action, children, submitLabel = "Save" }) {
  const uid = useId();
  const [state, run, pending] = useActionState(action, null);
  const errors = state?.ok === false ? (state.errors ?? {}) : {};
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => run(fd));
      }}
      noValidate
      className={card}
      aria-labelledby={`${uid}-t`}
    >
      <h2 id={`${uid}-t`} className="font-extrabold">
        {title}
      </h2>
      {description ? <p className="mt-1 text-[13px] text-fg-muted">{description}</p> : null}
      <div className="mt-5 grid gap-4">{children(errors, uid)}</div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-ink min-h-11">
          {pending ? "Saving…" : submitLabel}
        </button>
        {state?.message || (state?.ok === false && Object.keys(errors).length) ? (
          <p
            role="status"
            className={`flex items-center gap-1.5 text-[13px] font-semibold ${state.ok ? "text-success" : "text-sale"}`}
          >
            {state.ok ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
            {state.message ?? "Please fix the highlighted field."}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** Labelled input with hint and error. */
export function Field({ id, name, label, hint, error, className = "", ...props }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelCls}>
        {label}
        {hint ? <span className="font-normal text-fg-muted"> · {hint}</span> : null}
      </label>
      <input
        id={id}
        name={name}
        className={field}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        {...props}
      />
      {error ? <FieldError id={`${id}-err`} text={error} /> : null}
    </div>
  );
}

export function FieldError({ id, text }) {
  return (
    <p id={id} className="mt-1 flex items-start gap-1 text-[13px] font-semibold text-sale">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      {text}
    </p>
  );
}

/** On/off switch (a styled checkbox) with title and description. */
export function Toggle({ name, title, description, defaultChecked, error, disabled, onChange }) {
  const id = useId();
  return (
    <div>
      <label
        htmlFor={id}
        className={`flex items-start justify-between gap-4 rounded-xl border border-line p-4 ${disabled ? "opacity-60" : "cursor-pointer"}`}
      >
        <span>
          <span className="block text-sm font-bold">{title}</span>
          {description ? <span className="mt-0.5 block text-[13px] text-fg-muted">{description}</span> : null}
        </span>
        <span className="relative mt-0.5 inline-flex shrink-0">
          <input
            id={id}
            type="checkbox"
            name={name}
            role="switch"
            defaultChecked={defaultChecked}
            disabled={disabled}
            onChange={onChange}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-err` : undefined}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="h-7 w-12 rounded-full bg-muted ring-1 ring-line transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
          />
          <span
            aria-hidden="true"
            className="absolute top-1 left-1 size-5 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-5"
          />
        </span>
      </label>
      {error ? <FieldError id={`${id}-err`} text={error} /> : null}
    </div>
  );
}

const localWhatsApp = (v) => (v && /^92\d{10}$/.test(v) ? formatPhone(`0${v.slice(2)}`) : (v ?? ""));

export function StoreSettingsForm({ s }) {
  const [wa, setWa] = useState(localWhatsApp(s.whatsappNumber));
  return (
    <SettingsForm
      title="Store details"
      description="Shown to customers in the footer, emails and order pages."
      action={saveStoreSettings}
    >
      {(e, uid) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`${uid}-name`}
              name="storeName"
              label="Store name"
              defaultValue={s.storeName}
              maxLength={120}
              error={e.storeName}
            />
            <Field
              id={`${uid}-email`}
              name="supportEmail"
              type="email"
              label="Support email"
              hint="optional"
              defaultValue={s.supportEmail ?? ""}
              maxLength={191}
              error={e.supportEmail}
            />
            <Field
              id={`${uid}-phone`}
              name="supportPhone"
              type="tel"
              label="Support phone"
              hint="optional"
              defaultValue={s.supportPhone ?? ""}
              maxLength={20}
              placeholder="042 1234567 or 0300 1234567"
              error={e.supportPhone}
            />
            <Field
              id={`${uid}-wa`}
              name="whatsappNumber"
              type="tel"
              inputMode="tel"
              label="WhatsApp number"
              hint="shows the chat button"
              value={wa}
              onChange={(ev) => setWa(formatPhone(ev.target.value))}
              maxLength={16}
              placeholder="0300 1234567"
              error={e.whatsappNumber}
            />
          </div>

          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <Field
              id={`${uid}-ann`}
              name="announcementText"
              label="Announcement bar"
              hint="leave empty to hide"
              defaultValue={s.announcementText ?? ""}
              maxLength={200}
              placeholder="Eid Sale: up to 30% off. Free delivery over Rs 5,000"
              error={e.announcementText}
            />
            <Field
              id={`${uid}-annlink`}
              name="announcementLink"
              label="Announcement link"
              hint="optional, e.g. /offers"
              defaultValue={s.announcementLink ?? ""}
              maxLength={255}
              placeholder="/offers"
              error={e.announcementLink}
            />
          </div>

          <Toggle
            name="maintenanceMode"
            title="Maintenance mode"
            description="Customers see a “We'll be back soon” page and can't order. Signed-in staff still see the store."
            defaultChecked={s.maintenanceMode}
          />

          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Toggle
              name="guestCheckoutEnabled"
              title="Guest checkout"
              description="Customers can order without creating an account."
              defaultChecked={s.guestCheckoutEnabled}
            />
            <Toggle
              name="reviewsEnabled"
              title="Product reviews"
              description="Customers can review shoes they bought."
              defaultChecked={s.reviewsEnabled}
            />
            <Toggle
              name="reviewsRequireApproval"
              title="Approve reviews first"
              description="New reviews stay hidden until you approve them."
              defaultChecked={s.reviewsRequireApproval}
            />
            <Field
              id={`${uid}-low`}
              name="lowStockThreshold"
              type="number"
              min={0}
              max={1000}
              label="Low stock warning"
              hint="pairs per size"
              defaultValue={s.lowStockThreshold}
              error={e.lowStockThreshold}
            />
          </div>
        </>
      )}
    </SettingsForm>
  );
}

export function PaymentSettingsForm({ s, safepay }) {
  return (
    <SettingsForm
      title="Payment methods"
      description="What customers can choose at checkout."
      action={savePaymentSettings}
    >
      {(e, uid) => (
        <>
          <Toggle
            name="codEnabled"
            title="Cash on delivery"
            description="The rider collects payment at the door. COD fees are set per delivery rate."
            defaultChecked={s.codEnabled}
            error={e.codEnabled}
          />
          <Field
            id={`${uid}-codmax`}
            name="codMaxOrderAmount"
            inputMode="decimal"
            label="Cash on delivery limit (Rs)"
            hint="optional; larger orders must pay by card"
            defaultValue={s.codMaxOrderAmount ? String(Number(s.codMaxOrderAmount)) : ""}
            placeholder="No limit"
            className="max-w-sm"
            error={e.codMaxOrderAmount}
          />
          <Toggle
            name="cardPaymentsEnabled"
            title="Cards and wallets (Safepay)"
            description={
              safepay.configured
                ? `Visa, Mastercard and wallets through Safepay (${safepay.environment === "production" ? "live" : "sandbox, test payments only"}).`
                : "Add the Safepay keys below to switch this on."
            }
            defaultChecked={s.cardPaymentsEnabled}
            disabled={!safepay.configured && !s.cardPaymentsEnabled}
            error={e.cardPaymentsEnabled}
          />
        </>
      )}
    </SettingsForm>
  );
}

export function ReturnSettingsForm({ s }) {
  return (
    <SettingsForm
      title="Returns and exchanges"
      description="Shown on product pages, checkout and in the customer's account."
      action={saveReturnSettings}
    >
      {(e, uid) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              name="returnsEnabled"
              title="Accept returns"
              description="Customers can request a return or size exchange from their account."
              defaultChecked={s.returnsEnabled}
            />
            <Toggle
              name="refundsEnabled"
              title="Offer refunds"
              description="Off means returns are for exchange or store credit only."
              defaultChecked={s.refundsEnabled}
            />
          </div>
          <Field
            id={`${uid}-days`}
            name="returnWindowDays"
            type="number"
            min={1}
            max={90}
            label="Return window"
            hint="days after delivery"
            defaultValue={s.returnWindowDays}
            className="max-w-xs"
            error={e.returnWindowDays}
          />
          <div>
            <label htmlFor={`${uid}-policy`} className={labelCls}>
              Returns policy <span className="font-normal text-fg-muted">· shown to customers</span>
            </label>
            <textarea
              id={`${uid}-policy`}
              name="returnPolicy"
              rows={8}
              maxLength={10_000}
              defaultValue={s.returnPolicy ?? ""}
              placeholder={
                "Shoes must be unworn, in the original box.\nSale items can be exchanged for a different size.\nWe arrange the pickup in major cities."
              }
              className={`${field} py-2.5 leading-relaxed`}
            />
          </div>
        </>
      )}
    </SettingsForm>
  );
}

export function TaxModeForm({ s }) {
  return (
    <SettingsForm title="How prices are shown" action={saveTaxMode}>
      {(_e, uid) => (
        <fieldset>
          <legend className="sr-only">Prices and GST</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["included", "Prices include GST", "The price on the tag is what customers pay. GST is shown inside it."],
              ["excluded", "GST added at checkout", "GST is added on top of product prices at checkout."],
            ].map(([value, title, hint]) => (
              <label
                key={value}
                className="flex cursor-pointer gap-3 rounded-xl border border-line p-3.5 has-checked:border-fg has-checked:bg-muted"
              >
                <input
                  type="radio"
                  name="pricesIncludeTax"
                  value={value}
                  id={`${uid}-${value}`}
                  defaultChecked={(value === "included") === s.pricesIncludeTax}
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
      )}
    </SettingsForm>
  );
}

export function FreeDeliveryForm({ s }) {
  return (
    <SettingsForm
      title="Free delivery"
      description="Store-wide offer. Individual rates can also be free above their own amount."
      action={saveFreeDelivery}
    >
      {(e, uid) => (
        <>
          <Toggle
            name="freeDeliveryEnabled"
            title="Free delivery on bigger orders"
            description="Delivery is free when the order (after discounts) reaches the amount below."
            defaultChecked={s.freeDeliveryEnabled}
          />
          <Field
            id={`${uid}-free`}
            name="freeDeliveryThreshold"
            inputMode="decimal"
            label="For orders over (Rs)"
            defaultValue={s.freeDeliveryThreshold ? String(Number(s.freeDeliveryThreshold)) : ""}
            placeholder="5000"
            className="max-w-sm"
            error={e.freeDeliveryThreshold}
          />
        </>
      )}
    </SettingsForm>
  );
}
