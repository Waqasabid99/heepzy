"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { placeOrder, quoteCheckout } from "@/actions/checkout";
import { formatPKR } from "@/lib/money";
import { AlertCircle, Banknote, Check, CreditCard, ShieldCheck, Truck, WhatsApp } from "@/components/ui/icons";
import { CityCombobox } from "@/components/store/city-combobox";
import { canonicalCity, isListedCity } from "@/lib/pk-cities";
import { formatPhone } from "@/lib/phone";

const LABELS = {
  email: "Email",
  phone: "Mobile number",
  fullName: "Full name",
  line1: "Address",
  line2: "Apartment, area",
  city: "City",
  province: "Province",
  postalCode: "Postal code",
  rateId: "Delivery",
  paymentMethod: "Payment",
  couponCode: "Voucher",
  note: "Note",
};

const field =
  "min-h-12 w-full rounded-xl border border-field bg-surface px-3.5 text-[15px] text-fg placeholder:text-fg-muted aria-invalid:border-sale";
const label = "mb-1.5 block text-[13px] font-bold";
const card = "rounded-2xl border border-line bg-surface p-5 sm:p-6";

/** Checkout: contact, address, delivery option, payment, voucher and a live summary. */
export function CheckoutForm({ lines, unavailable, provinces, payment, initial, signedIn, returnDays }) {
  const uid = useId();
  const [state, action, placing] = useActionState(placeOrder, null);
  const errors = state?.ok === false ? (state.errors ?? {}) : {};

  const [city, setCity] = useState(canonicalCity(initial.province, initial.city) ?? initial.city);
  const [province, setProvince] = useState(initial.province);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(formatPhone(initial.phone));
  const [method, setMethod] = useState(payment.whatsapp ? "WHATSAPP" : payment.cod ? "COD" : "CARD");
  const [rateId, setRateId] = useState("");
  const [coupon, setCoupon] = useState(""); // applied code
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState(null);
  const [q, setQ] = useState(null);
  const [quoting, startQuote] = useTransition();

  function refresh(patch = {}) {
    const input = { city, province, rateId, paymentMethod: method, couponCode: coupon, email, ...patch };
    startQuote(async () => {
      const res = await quoteCheckout(input);
      if (!res.ok) return;
      setQ(res.quote);
      if (res.quote.rate && res.quote.rate.id !== input.rateId) setRateId(res.quote.rate.id);
      if (patch.applyCoupon) {
        if (res.quote.coupon) {
          setCoupon(res.quote.coupon.code);
          setCouponMsg({ ok: true, text: `Voucher ${res.quote.coupon.code} applied.` });
        } else {
          setCouponMsg({ ok: false, text: res.quote.couponMessage ?? "That voucher can't be used." });
        }
      }
      if (!payment.whatsapp && !res.quote.codAllowed && input.paymentMethod === "COD" && payment.card)
        setMethod("CARD");
    });
  }

  // First quote on load (subtotal; delivery once an address is known).
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    refresh();
  });

  const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0);
  const hasAddress = Boolean(city.trim() && province);
  const summary = q ?? { subtotal, discount: 0, shipping: 0, codFee: 0, grandTotal: subtotal, rates: [], tax: null };

  const err = (k) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${uid}-${k}-err` } : {});
  const errorEntries = Object.entries(errors);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]"
    >
      <input type="hidden" name="rateId" value={rateId} />
      <input type="hidden" name="paymentMethod" value={method} />
      <input type="hidden" name="couponCode" value={coupon} />

      <div className="grid content-start gap-5">
        {state?.ok === false && (state.message || errorEntries.length) ? (
          <div role="alert" className="rounded-xl border-2 border-sale bg-danger-bg px-4 py-3.5 text-sale">
            <p className="flex items-center gap-2 text-sm font-extrabold">
              <AlertCircle className="size-4 shrink-0" />
              {state.message ?? "Please check the following:"}
            </p>
            {errorEntries.length ? (
              <ul className="mt-2 grid gap-1 pl-6 text-sm">
                {errorEntries.map(([k, text]) => (
                  <li key={k}>
                    <a href={`#${uid}-${k}`} className="font-semibold underline underline-offset-4">
                      {LABELS[k] ? `${LABELS[k]}: ` : ""}
                      {text}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {unavailable ? (
          <p className="rounded-xl bg-warning-bg px-4 py-3 text-sm font-semibold text-warning">
            {unavailable} {unavailable === 1 ? "item in your bag is" : "items in your bag are"} no longer available and
            won&apos;t be included.{" "}
            <Link href="/cart" className="underline">
              Review bag
            </Link>
          </p>
        ) : null}

        <section aria-labelledby={`${uid}-contact`} className={card}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id={`${uid}-contact`} className="text-lg font-extrabold">
              Contact
            </h2>
            {!signedIn ? (
              <p className="text-[13px] text-fg-muted">
                Have an account?{" "}
                <Link href="/login?next=/checkout" className="font-bold underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${uid}-email`} label="Email" error={errors.email} errId={`${uid}-email-err`}>
              <input
                id={`${uid}-email`}
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={field}
                {...err("email")}
              />
            </Field>
            <Field
              id={`${uid}-phone`}
              label="WhatsApp number"
              hint="We send your order updates here"
              error={errors.phone}
              errId={`${uid}-phone-err`}
            >
              <input
                id={`${uid}-phone`}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                maxLength={16}
                placeholder="0300 1234567"
                required
                className={field}
                {...err("phone")}
              />
            </Field>
          </div>
        </section>

        <section aria-labelledby={`${uid}-addr`} className={card}>
          <h2 id={`${uid}-addr`} className="mb-4 text-lg font-extrabold">
            Delivery address
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${uid}-fullName`} label="Full name" error={errors.fullName} errId={`${uid}-fullName-err`} wide>
              <input
                id={`${uid}-fullName`}
                name="fullName"
                autoComplete="name"
                defaultValue={initial.fullName}
                required
                className={field}
                {...err("fullName")}
              />
            </Field>
            <Field
              id={`${uid}-line1`}
              label="Address"
              hint="House number, street"
              error={errors.line1}
              errId={`${uid}-line1-err`}
              wide
            >
              <input
                id={`${uid}-line1`}
                name="line1"
                autoComplete="address-line1"
                defaultValue={initial.line1}
                required
                className={field}
                {...err("line1")}
              />
            </Field>
            <Field id={`${uid}-line2`} label="Area, block or landmark (optional)" wide>
              <input
                id={`${uid}-line2`}
                name="line2"
                autoComplete="address-line2"
                defaultValue={initial.line2}
                className={field}
              />
            </Field>
            <Field id={`${uid}-province`} label="Province" error={errors.province} errId={`${uid}-province-err`}>
              <select
                id={`${uid}-province`}
                name="province"
                value={province}
                onChange={(e) => {
                  const p = e.target.value;
                  setProvince(p);
                  // A city from another province no longer applies.
                  const next = isListedCity(p, city) ? city : "";
                  if (next !== city) setCity(next);
                  if (next && p) refresh({ province: p, city: next });
                }}
                required
                className={field}
                {...err("province")}
              >
                <option value="">Choose…</option>
                {Object.entries(provinces).map(([key, name]) => (
                  <option key={key} value={key}>
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id={`${uid}-city`} label="City" error={errors.city} errId={`${uid}-city-err`}>
              <CityCombobox
                key={province}
                id={`${uid}-city`}
                name="city"
                province={province}
                value={city}
                onChange={(c) => {
                  setCity(c);
                  if (c && province) refresh({ city: c });
                }}
                className={field}
                invalidProps={err("city")}
              />
            </Field>
            <Field
              id={`${uid}-postalCode`}
              label="Postal code (optional)"
              error={errors.postalCode}
              errId={`${uid}-postalCode-err`}
            >
              <input
                id={`${uid}-postalCode`}
                name="postalCode"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={5}
                defaultValue={initial.postalCode}
                className={field}
                {...err("postalCode")}
              />
            </Field>
          </div>
        </section>

        <section aria-labelledby={`${uid}-rateId`} className={card} tabIndex={-1}>
          <h2 id={`${uid}-rateId`} className="mb-4 text-lg font-extrabold">
            Delivery
          </h2>
          {errors.rateId ? <ErrorText id={`${uid}-rateId-err`} text={errors.rateId} /> : null}
          {!hasAddress ? (
            <p className="text-sm text-fg-muted">Enter your city and province to see delivery options.</p>
          ) : summary.rates.length ? (
            <fieldset>
              <legend className="sr-only">Delivery option</legend>
              <div className="grid gap-2">
                {summary.rates.map((r) => (
                  <label key={r.id} className={choice}>
                    <input
                      type="radio"
                      name={`${uid}-rate`}
                      checked={rateId === r.id}
                      onChange={() => {
                        setRateId(r.id);
                        refresh({ rateId: r.id });
                      }}
                      className="size-5 accent-fg"
                    />
                    <Truck className="size-5 shrink-0 text-fg-muted" />
                    <span className="flex-1">
                      <span className="block font-bold">{r.name}</span>
                      <span className="block text-[13px] text-fg-muted">{r.eta ?? r.zone}</span>
                    </span>
                    <span className="font-bold">
                      {r.price === 0 ? <span className="text-success">Free</span> : formatPKR(r.price)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <p className="text-sm text-fg-muted">
              {quoting ? "Checking delivery options…" : "We don't deliver to this address yet."}
            </p>
          )}
        </section>

        <section aria-labelledby={`${uid}-paymentMethod`} className={card} tabIndex={-1}>
          {payment.whatsapp ? (
            <>
              <h2 id={`${uid}-paymentMethod`} className="mb-3 text-lg font-extrabold">
                Confirm on WhatsApp
              </h2>
              <p className="flex items-start gap-3 rounded-xl bg-muted p-4 text-sm">
                <WhatsApp className="mt-0.5 size-5 shrink-0 text-whatsapp-deep" />
                <span>
                  When you tap <strong>Send order on WhatsApp</strong>, WhatsApp opens with your order typed in. Just
                  press send. We&apos;ll reply to confirm and agree how you&apos;d like to pay.
                </span>
              </p>
            </>
          ) : (
            <>
              <h2 id={`${uid}-paymentMethod`} className="mb-4 text-lg font-extrabold">
                Payment
              </h2>
              {errors.paymentMethod ? <ErrorText id={`${uid}-paymentMethod-err`} text={errors.paymentMethod} /> : null}
              <fieldset>
                <legend className="sr-only">Payment method</legend>
                <div className="grid gap-2">
                  {payment.cod ? (
                    <label className={`${choice} ${q && !q.codAllowed ? "opacity-50" : ""}`}>
                      <input
                        type="radio"
                        name={`${uid}-pay`}
                        checked={method === "COD"}
                        disabled={Boolean(q && !q.codAllowed)}
                        onChange={() => {
                          setMethod("COD");
                          refresh({ paymentMethod: "COD" });
                        }}
                        className="size-5 accent-fg"
                      />
                      <Banknote className="size-5 shrink-0 text-fg-muted" />
                      <span className="flex-1">
                        <span className="block font-bold">Cash on delivery</span>
                        <span className="block text-[13px] text-fg-muted">
                          {q && !q.codAllowed
                            ? `Not available for orders over ${formatPKR(q.codLimit)}`
                            : "Pay the rider in cash when your order arrives"}
                        </span>
                      </span>
                    </label>
                  ) : null}
                  {payment.card ? (
                    <label className={choice}>
                      <input
                        type="radio"
                        name={`${uid}-pay`}
                        checked={method === "CARD"}
                        onChange={() => {
                          setMethod("CARD");
                          refresh({ paymentMethod: "CARD" });
                        }}
                        className="size-5 accent-fg"
                      />
                      <CreditCard className="size-5 shrink-0 text-fg-muted" />
                      <span className="flex-1">
                        <span className="block font-bold">Debit / credit card or wallet</span>
                        <span className="block text-[13px] text-fg-muted">
                          Secure payment with Safepay. You&apos;ll be taken to Safepay to pay.
                          {payment.sandbox ? " (Test mode)" : ""}
                        </span>
                      </span>
                    </label>
                  ) : null}
                </div>
              </fieldset>
            </>
          )}
          <div className="mt-4">
            <label htmlFor={`${uid}-note`} className={label}>
              Note for the rider or store (optional)
            </label>
            <textarea id={`${uid}-note`} name="note" rows={2} maxLength={500} className={`${field} py-2.5`} />
          </div>
        </section>
      </div>

      {/* Summary */}
      <aside aria-labelledby={`${uid}-summary`} className="lg:sticky lg:top-28 lg:self-start">
        <div className={card}>
          <h2 id={`${uid}-summary`} className="mb-4 text-lg font-extrabold">
            Order summary
          </h2>
          <ul className="grid gap-3">
            {lines.map((l) => (
              <li key={l.id} className="flex gap-3">
                <span className="relative size-16 shrink-0 bg-muted">
                  {l.image ? <Image src={l.image} alt="" fill sizes="64px" className="object-cover" /> : null}
                  <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-fg text-[11px] font-bold text-bg">
                    {l.quantity}
                  </span>
                </span>
                <span className="flex-1 text-sm">
                  <span className="block font-bold">{l.name}</span>
                  <span className="block text-fg-muted">
                    {l.color} · {l.size}
                  </span>
                </span>
                <span className="text-sm font-semibold">{formatPKR(l.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 border-t border-line pt-4">
            <label htmlFor={`${uid}-couponCode`} className={label}>
              Voucher code
            </label>
            {coupon ? (
              <p className="flex items-center justify-between gap-2 rounded-xl bg-success-bg px-3.5 py-2.5 text-sm font-semibold text-success">
                <span className="flex items-center gap-1.5">
                  <Check className="size-4" /> {coupon} applied
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCoupon("");
                    setCouponMsg(null);
                    refresh({ couponCode: "" });
                  }}
                  className="min-h-9 font-bold underline underline-offset-4"
                >
                  Remove
                </button>
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  id={`${uid}-couponCode`}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (couponInput.trim()) refresh({ couponCode: couponInput.trim(), applyCoupon: true });
                    }
                  }}
                  maxLength={40}
                  autoComplete="off"
                  className={`${field} min-h-11 uppercase`}
                  {...err("couponCode")}
                />
                <button
                  type="button"
                  disabled={!couponInput.trim() || quoting}
                  onClick={() => refresh({ couponCode: couponInput.trim(), applyCoupon: true })}
                  className="btn-outline min-h-11 shrink-0"
                >
                  Apply
                </button>
              </div>
            )}
            {couponMsg && !coupon ? (
              <p role="status" className="mt-1.5 text-[13px] font-semibold text-sale">
                {couponMsg.text}
              </p>
            ) : null}
            {errors.couponCode ? <ErrorText id={`${uid}-couponCode-err`} text={errors.couponCode} /> : null}
          </div>

          <dl className="mt-5 grid gap-2 border-t border-line pt-4 text-sm" aria-live="polite" aria-busy={quoting}>
            <Row term="Subtotal" value={formatPKR(summary.subtotal)} />
            {summary.discount ? (
              <Row term={`Voucher (${coupon})`} value={`− ${formatPKR(summary.discount)}`} accent />
            ) : null}
            <Row
              term="Delivery"
              value={
                !hasAddress || !summary.rate
                  ? "Add address"
                  : summary.shipping === 0
                    ? "Free"
                    : formatPKR(summary.shipping)
              }
            />
            {summary.codFee ? <Row term="Cash on delivery fee" value={formatPKR(summary.codFee)} /> : null}
            {summary.tax && !summary.tax.included ? (
              <Row term={`${summary.tax.name} (${summary.tax.percent}%)`} value={formatPKR(summary.tax.amount)} />
            ) : null}
            <div className="mt-2 flex items-baseline justify-between border-t border-line pt-3">
              <dt className="text-base font-extrabold">Total</dt>
              <dd className="font-display text-3xl font-semibold">{formatPKR(summary.grandTotal)}</dd>
            </div>
            {summary.tax?.included ? (
              <p className="text-xs text-fg-muted">
                Includes {formatPKR(summary.tax.amount)} {summary.tax.name}.
              </p>
            ) : null}
          </dl>

          <button
            type="submit"
            disabled={placing || quoting}
            className={`btn mt-5 min-h-14 w-full text-base ${
              payment.whatsapp
                ? "bg-whatsapp-deep text-white hover:opacity-90"
                : "bg-accent text-accent-fg hover:bg-accent-hover"
            }`}
          >
            {payment.whatsapp ? (
              placing ? (
                "Opening WhatsApp…"
              ) : (
                <>
                  <WhatsApp className="size-5" /> Send order on WhatsApp
                </>
              )
            ) : placing ? (
              method === "CARD" ? (
                "Taking you to Safepay…"
              ) : (
                "Placing order…"
              )
            ) : method === "CARD" ? (
              `Pay ${formatPKR(summary.grandTotal)}`
            ) : (
              "Place order"
            )}
          </button>
          <ul className="mt-4 grid gap-1.5 text-[13px] text-fg-muted">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              {payment.whatsapp
                ? "No payment now. You confirm the order with us on WhatsApp."
                : "Secure checkout. We never see your card details."}
            </li>
            {returnDays ? (
              <li className="flex items-center gap-2">
                <Truck className="size-4" /> {returnDays}-day size exchange
              </li>
            ) : null}
          </ul>
        </div>
      </aside>
    </form>
  );
}

const choice =
  "flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3 has-checked:border-fg has-checked:shadow-[0_0_0_1px_var(--hz-fg)] has-disabled:cursor-not-allowed";

function Field({ id, label: text, hint, error, errId, wide, children }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className={label}>
        {text}
        {hint ? <span className="ml-1 font-normal text-fg-muted">· {hint}</span> : null}
      </label>
      {children}
      {error ? <ErrorText id={errId} text={error} /> : null}
    </div>
  );
}

function ErrorText({ id, text }) {
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-sale">
      <AlertCircle className="size-4 shrink-0" /> {text}
    </p>
  );
}

function Row({ term, value, accent }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-fg-muted">{term}</dt>
      <dd className={`font-semibold ${accent ? "text-success" : ""}`}>{value}</dd>
    </div>
  );
}
