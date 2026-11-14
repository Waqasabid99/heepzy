"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { adminQuote, createAdminOrder, findCustomers, findProducts } from "@/actions/admin/order-create";
import { ErrorSummary } from "@/components/admin/error-summary";
import { CityCombobox } from "@/components/store/city-combobox";
import { formatPKR } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { isListedCity } from "@/lib/pk-cities";
import { PAID_VIA } from "@/lib/order-options";
import { AlertCircle, Close, Plus, Search, Trash } from "@/components/ui/icons";

const field =
  "min-h-11 w-full rounded-xl border border-field bg-surface px-3.5 text-sm text-fg aria-invalid:border-sale";
const label = "mb-1.5 block text-[13px] font-bold";
const card = "rounded-2xl border border-line bg-surface p-5 sm:p-6";
const choice =
  "flex cursor-pointer gap-3 rounded-xl border border-line p-3.5 has-checked:border-fg has-checked:bg-muted has-focus-visible:outline-2 has-focus-visible:outline-ring";
const chip =
  "inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line px-3.5 text-[13px] font-semibold has-checked:border-fg has-checked:bg-fg has-checked:text-bg has-disabled:cursor-not-allowed has-disabled:opacity-40 has-focus-visible:outline-2 has-focus-visible:outline-ring";

const LABELS = {
  customerId: "Customer",
  name: "Customer name",
  email: "Email",
  phone: "Contact number",
  items: "Items",
  fullName: "Recipient",
  shipPhone: "Delivery phone",
  line1: "Address",
  city: "City",
  province: "Province",
  postalCode: "Postal code",
  rateId: "Delivery",
  payment: "Payment",
  couponCode: "Voucher",
  extraDiscount: "Extra discount",
};

/** Debounced search through a server action. Returns [results, loading]. */
function useSearch(query, fn) {
  const [state, setState] = useState({ q: "", results: [] });
  const term = query.trim();
  useEffect(() => {
    if (term.length < 2) return undefined;
    let live = true;
    const t = setTimeout(() => {
      fn(term).then((results) => {
        if (live) setState({ q: term, results });
      });
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [term, fn]);
  if (term.length < 2) return [[], false];
  return [state.q === term ? state.results : [], state.q !== term];
}

/** Create an order for a customer from the admin panel. */
export function AdminOrderForm({ provinces, initialCustomer, cardAvailable }) {
  const uid = useId();
  const id = (k) => `${uid}-${k}`;
  const [creating, startCreate] = useTransition();
  const [result, setResult] = useState(null);
  const errors = result?.ok === false ? (result.errors ?? {}) : {};

  // ── Customer
  const [mode, setMode] = useState("existing");
  const [customer, setCustomer] = useState(initialCustomer);
  const [custQuery, setCustQuery] = useState("");
  const [custResults, custLoading] = useSearch(custQuery, findCustomers);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const firstAddress = initialCustomer?.addresses[0];
  const [phone, setPhone] = useState(formatPhone(initialCustomer?.phone || firstAddress?.phone || ""));

  // ── Items
  const [items, setItems] = useState([]); // { variantId, quantity, name, color, size, image, price, compareAt, stock }
  const [prodQuery, setProdQuery] = useState("");
  const [prodResults, prodLoading] = useSearch(prodQuery, findProducts);
  const [picked, setPicked] = useState(null);
  const [pickColor, setPickColor] = useState("");
  const [pickVariant, setPickVariant] = useState("");
  const [pickQty, setPickQty] = useState(1);

  // ── Address
  const [addressChoice, setAddressChoice] = useState(firstAddress?.id ?? "new");
  const [addr, setAddr] = useState({
    fullName: initialCustomer?.name ?? "",
    shipPhone: "",
    line1: "",
    line2: "",
    province: "",
    city: "",
    postalCode: "",
  });
  const [saveAddress, setSaveAddress] = useState(true);

  // ── Delivery, payment, discounts, notes
  const [rateId, setRateId] = useState("");
  const [payment, setPayment] = useState("COD");
  const [paidVia, setPaidVia] = useState(PAID_VIA[0]);
  const [paidRef, setPaidRef] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [extraDiscount, setExtraDiscount] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [status, setStatus] = useState("CONFIRMED");

  const saved = customer?.addresses.find((a) => a.id === addressChoice) ?? null;
  const ship = saved
    ? {
        fullName: saved.fullName,
        shipPhone: saved.phone,
        line1: saved.line1,
        line2: saved.line2 ?? "",
        province: saved.province,
        city: saved.city,
        postalCode: saved.postalCode ?? "",
      }
    : addr;
  const email = mode === "existing" ? (customer?.email ?? "") : guestEmail;
  const customerId = mode === "existing" ? (customer?.id ?? "") : "";

  // ── Live quote
  const quoteInput = useMemo(
    () => ({
      customerId,
      email,
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      city: ship.city,
      province: ship.province,
      rateId,
      payment,
      couponCode: coupon,
      extraDiscount: /^\d{1,9}(\.\d{1,2})?$/.test(extraDiscount) ? extraDiscount : "",
    }),
    [customerId, email, items, ship.city, ship.province, rateId, payment, coupon, extraDiscount],
  );
  const quoteKey = JSON.stringify(quoteInput);
  const [quoted, setQuoted] = useState({ key: null, data: null });
  useEffect(() => {
    if (!items.length) return undefined;
    let live = true;
    const t = setTimeout(() => {
      adminQuote(JSON.parse(quoteKey)).then((res) => {
        if (!live || !res?.ok) return;
        setQuoted({ key: quoteKey, data: res });
        if (res.quote.rateId && res.quote.rateId !== JSON.parse(quoteKey).rateId) setRateId(res.quote.rateId);
      });
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [quoteKey, items.length]);
  const q = items.length ? quoted.data?.quote : null;
  const linePrice = new Map((quoted.data?.lines ?? []).map((l) => [l.variantId, l]));
  const updating = items.length > 0 && quoted.key !== quoteKey;

  // ── Handlers
  function chooseCustomer(c) {
    setCustomer(c);
    setCustQuery("");
    setPhone(formatPhone(c.phone || c.addresses[0]?.phone || ""));
    setAddressChoice(c.addresses[0]?.id ?? "new");
    setAddr((a) => ({ ...a, fullName: c.name }));
  }
  function pickProduct(p) {
    setPicked(p);
    setProdQuery("");
    const colours = [...new Set(p.variants.map((v) => v.color))];
    setPickColor(colours[0] ?? "");
    setPickVariant("");
    setPickQty(1);
  }
  function addPicked() {
    const v = picked?.variants.find((x) => x.id === pickVariant);
    if (!v) return;
    setItems((list) => {
      const existing = list.find((i) => i.variantId === v.id);
      if (existing) {
        return list.map((i) =>
          i.variantId === v.id ? { ...i, quantity: Math.min(v.stock, i.quantity + pickQty) } : i,
        );
      }
      return [
        ...list,
        {
          variantId: v.id,
          quantity: Math.min(v.stock, pickQty),
          name: picked.name,
          color: v.color,
          size: v.size,
          image: picked.image,
          price: v.price,
          compareAt: v.compareAt,
          stock: v.stock,
        },
      ];
    });
    setPicked(null);
  }
  const setQty = (variantId, n) =>
    setItems((list) =>
      list.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(1, Math.min(i.stock, n)) } : i)),
    );
  const setA = (k) => (e) =>
    setAddr((a) => ({ ...a, [k]: k === "shipPhone" ? formatPhone(e.target.value) : e.target.value }));

  function submit(e) {
    e.preventDefault();
    const payload = {
      ...quoteInput,
      couponCode: coupon,
      extraDiscount: extraDiscount.trim(),
      name: mode === "guest" ? guestName : (customer?.name ?? ""),
      phone,
      fullName: ship.fullName || (mode === "guest" ? guestName : (customer?.name ?? "")),
      shipPhone: ship.shipPhone || phone,
      line1: ship.line1,
      line2: ship.line2,
      postalCode: ship.postalCode,
      saveAddress: mode === "existing" && !saved && saveAddress,
      paidVia,
      paidRef,
      discountReason,
      customerNote,
      adminNote,
      status,
    };
    if (mode === "existing" && !customer) {
      setResult({ ok: false, errors: { customerId: "Choose a customer, or switch to Guest" } });
      return;
    }
    startCreate(async () => {
      const res = await createAdminOrder(payload);
      if (res) setResult(res);
    });
  }

  const err = (k) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${id(k)}-err` } : {});
  const errText = (k) =>
    errors[k] ? (
      <p id={`${id(k)}-err`} className="mt-1 flex items-start gap-1 text-[13px] font-semibold text-sale">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
        {errors[k]}
      </p>
    ) : null;
  const targetFor = (k) =>
    ({
      customerId: id("cust-search"),
      items: id("prod-search"),
      rateId: id("rates"),
      payment: id("pay-COD"),
      couponCode: id("coupon"),
    })[k] ?? id(k);

  const colours = picked ? [...new Set(picked.variants.map((v) => v.color))] : [];
  const sizes = picked ? picked.variants.filter((v) => v.color === pickColor) : [];

  return (
    <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid content-start gap-5">
        {result?.ok === false ? (
          <ErrorSummary message={result.message} errors={errors} labels={LABELS} targetFor={targetFor} />
        ) : null}

        {/* Customer */}
        <section className={card} aria-labelledby={id("cust-h")}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id={id("cust-h")} className="font-extrabold">
              Customer
            </h2>
            <div role="group" aria-label="Customer type" className="flex gap-1.5">
              {[
                ["existing", "Existing customer"],
                ["guest", "Guest (no account)"],
              ].map(([k, t]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={mode === k}
                  onClick={() => setMode(k)}
                  className="min-h-9 rounded-full border border-line px-3.5 text-xs font-bold aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-bg"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {mode === "existing" ? (
            customer ? (
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-muted p-4 text-sm">
                <div>
                  <p className="font-bold">{customer.name}</p>
                  <p className="text-fg-muted">
                    {customer.email}
                    {customer.phone ? ` · ${customer.phone}` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => setCustomer(null)} className="btn-ghost min-h-9 text-[13px]">
                  Change
                </button>
              </div>
            ) : (
              <div>
                <label htmlFor={id("cust-search")} className={label}>
                  Find a customer
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-muted" />
                  <input
                    id={id("cust-search")}
                    type="search"
                    value={custQuery}
                    onChange={(e) => setCustQuery(e.target.value)}
                    placeholder="Name, email or phone"
                    autoComplete="off"
                    className={`${field} pl-10`}
                    {...err("customerId")}
                  />
                </div>
                {errText("customerId")}
                <ResultList
                  query={custQuery}
                  loading={custLoading}
                  empty={
                    <>
                      No customers found.{" "}
                      <Link href="/admin/customers/new" className="font-bold underline underline-offset-4">
                        Create a customer
                      </Link>{" "}
                      or use Guest.
                    </>
                  }
                >
                  {custResults.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => chooseCustomer(c)}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted"
                      >
                        <span className="font-bold">{c.name}</span>
                        <span className="block text-[13px] text-fg-muted">
                          {c.email}
                          {c.phone ? ` · ${c.phone}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                </ResultList>
              </div>
            )
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={id("name")} className={label}>
                  Name
                </label>
                <input
                  id={id("name")}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  maxLength={120}
                  className={field}
                  {...err("name")}
                />
                {errText("name")}
              </div>
              <div>
                <label htmlFor={id("email")} className={label}>
                  Email <span className="font-normal text-fg-muted">· optional</span>
                </label>
                <input
                  id={id("email")}
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  maxLength={191}
                  className={field}
                  {...err("email")}
                />
                {errText("email")}
              </div>
            </div>
          )}

          <div className="mt-4 max-w-xs">
            <label htmlFor={id("phone")} className={label}>
              Contact number
            </label>
            <input
              id={id("phone")}
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              maxLength={16}
              placeholder="0300 1234567"
              className={field}
              {...err("phone")}
            />
            {errText("phone")}
          </div>
        </section>

        {/* Items */}
        <section className={card} aria-labelledby={id("items-h")}>
          <h2 id={id("items-h")} className="mb-4 font-extrabold">
            Items
          </h2>
          {items.length ? (
            <ul className="mb-5 grid gap-3">
              {items.map((i) => {
                const live = linePrice.get(i.variantId);
                const unit = live?.unitPrice ?? i.price;
                const was = live ? live.compareAt : i.compareAt;
                return (
                  <li key={i.variantId} className="flex items-center gap-3 rounded-xl bg-muted p-3">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                      {i.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                        <img src={i.image} alt="" className="size-full object-cover" />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="block font-bold">{i.name}</span>
                      <span className="block text-fg-muted">
                        {i.color} · Size {i.size} · {i.stock} in stock
                      </span>
                      <span className="block">
                        {was ? <s className="mr-1.5 text-fg-muted">{formatPKR(was)}</s> : null}
                        {formatPKR(unit)}
                      </span>
                    </span>
                    <span className="flex items-center rounded-full border border-line bg-surface">
                      <button
                        type="button"
                        onClick={() => setQty(i.variantId, i.quantity - 1)}
                        disabled={i.quantity <= 1}
                        aria-label={`One fewer ${i.name}`}
                        className="grid size-9 place-items-center rounded-full disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm font-bold" aria-live="polite">
                        {i.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(i.variantId, i.quantity + 1)}
                        disabled={i.quantity >= i.stock}
                        aria-label={`One more ${i.name}`}
                        className="grid size-9 place-items-center rounded-full disabled:opacity-40"
                      >
                        +
                      </button>
                    </span>
                    <button
                      type="button"
                      onClick={() => setItems((l) => l.filter((x) => x.variantId !== i.variantId))}
                      aria-label={`Remove ${i.name}, size ${i.size}`}
                      className="grid size-10 place-items-center rounded-full hover:bg-surface"
                    >
                      <Trash className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {picked ? (
            <div className="grid gap-4 rounded-xl border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold">{picked.name}</p>
                <button
                  type="button"
                  onClick={() => setPicked(null)}
                  aria-label="Cancel"
                  className="grid size-9 place-items-center rounded-full hover:bg-muted"
                >
                  <Close className="size-4" />
                </button>
              </div>
              {colours.length > 1 ? (
                <fieldset>
                  <legend className={label}>Colour</legend>
                  <div className="flex flex-wrap gap-2">
                    {colours.map((c) => (
                      <label key={c} className={chip}>
                        <input
                          type="radio"
                          name={id("pick-colour")}
                          className="sr-only"
                          checked={pickColor === c}
                          onChange={() => {
                            setPickColor(c);
                            setPickVariant("");
                          }}
                        />
                        {c}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              <fieldset>
                <legend className={label}>Size {colours.length === 1 ? `· ${colours[0]}` : ""}</legend>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((v) => (
                    <label key={v.id} className={chip} title={`${v.stock} in stock`}>
                      <input
                        type="radio"
                        name={id("pick-size")}
                        className="sr-only"
                        disabled={v.stock <= 0}
                        checked={pickVariant === v.id}
                        onChange={() => setPickVariant(v.id)}
                      />
                      {v.size}
                      <span className="sr-only">, {v.stock} in stock</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor={id("pick-qty")} className={label}>
                    Quantity
                  </label>
                  <input
                    id={id("pick-qty")}
                    type="number"
                    min={1}
                    max={50}
                    value={pickQty}
                    onChange={(e) => setPickQty(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                    className={`${field} w-24`}
                  />
                </div>
                <button type="button" onClick={addPicked} disabled={!pickVariant} className="btn-ink min-h-11">
                  <Plus className="size-4" /> Add to order
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor={id("prod-search")} className={label}>
                Add a product
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-muted" />
                <input
                  id={id("prod-search")}
                  type="search"
                  value={prodQuery}
                  onChange={(e) => setProdQuery(e.target.value)}
                  placeholder="Product name or SKU"
                  autoComplete="off"
                  className={`${field} pl-10`}
                  {...err("items")}
                />
              </div>
              {errText("items")}
              <ResultList query={prodQuery} loading={prodLoading} empty="No active products match.">
                {prodResults.map((p) => {
                  const inStock = p.variants.reduce((n, v) => n + Math.max(0, v.stock), 0);
                  const from = Math.min(...p.variants.map((v) => v.price));
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => pickProduct(p)}
                        disabled={!inStock}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted disabled:opacity-50"
                      >
                        <span className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element -- small admin thumbnail
                            <img src={p.image} alt="" className="size-full object-cover" />
                          ) : null}
                        </span>
                        <span className="flex-1">
                          <span className="font-bold">{p.name}</span>
                          <span className="block text-[13px] text-fg-muted">
                            {inStock ? `${inStock} pairs in stock` : "Out of stock"}
                            {Number.isFinite(from) ? ` · from ${formatPKR(from)}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ResultList>
            </div>
          )}
        </section>

        {/* Address */}
        <section className={card} aria-labelledby={id("addr-h")}>
          <h2 id={id("addr-h")} className="mb-4 font-extrabold">
            Delivery address
          </h2>
          {mode === "existing" && customer?.addresses.length ? (
            <fieldset className="mb-4">
              <legend className="sr-only">Saved addresses</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {customer.addresses.map((a) => (
                  <label key={a.id} className={choice}>
                    <input
                      type="radio"
                      name={id("addr")}
                      checked={addressChoice === a.id}
                      onChange={() => setAddressChoice(a.id)}
                      className="mt-0.5 size-4 accent-current"
                    />
                    <span className="text-[13px]">
                      <span className="block font-bold">
                        {a.label || "Address"}
                        {a.isDefault ? " · default" : ""}
                      </span>
                      {a.fullName}, {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}, {a.city}
                      <span className="block text-fg-muted">{a.phone}</span>
                    </span>
                  </label>
                ))}
                <label className={choice}>
                  <input
                    type="radio"
                    name={id("addr")}
                    checked={addressChoice === "new"}
                    onChange={() => setAddressChoice("new")}
                    className="mt-0.5 size-4 accent-current"
                  />
                  <span className="text-sm font-bold">A different address</span>
                </label>
              </div>
            </fieldset>
          ) : null}

          {!saved ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={id("fullName")} className={label}>
                  Recipient name
                </label>
                <input
                  id={id("fullName")}
                  value={addr.fullName || (mode === "guest" ? guestName : "")}
                  onChange={setA("fullName")}
                  maxLength={120}
                  className={field}
                  {...err("fullName")}
                />
                {errText("fullName")}
              </div>
              <div>
                <label htmlFor={id("shipPhone")} className={label}>
                  Delivery phone <span className="font-normal text-fg-muted">· if different</span>
                </label>
                <input
                  id={id("shipPhone")}
                  type="tel"
                  inputMode="tel"
                  value={addr.shipPhone}
                  onChange={setA("shipPhone")}
                  maxLength={16}
                  placeholder={phone || "0300 1234567"}
                  className={field}
                  {...err("shipPhone")}
                />
                {errText("shipPhone")}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={id("line1")} className={label}>
                  House number, street
                </label>
                <input
                  id={id("line1")}
                  value={addr.line1}
                  onChange={setA("line1")}
                  maxLength={255}
                  className={field}
                  {...err("line1")}
                />
                {errText("line1")}
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={id("line2")} className={label}>
                  Area, block or landmark <span className="font-normal text-fg-muted">· optional</span>
                </label>
                <input id={id("line2")} value={addr.line2} onChange={setA("line2")} maxLength={255} className={field} />
              </div>
              <div>
                <label htmlFor={id("province")} className={label}>
                  Province
                </label>
                <select
                  id={id("province")}
                  value={addr.province}
                  onChange={(e) => {
                    const p = e.target.value;
                    setAddr((a) => ({ ...a, province: p, city: isListedCity(p, a.city) ? a.city : "" }));
                  }}
                  className={field}
                  {...err("province")}
                >
                  <option value="">Choose…</option>
                  {Object.entries(provinces).map(([k, n]) => (
                    <option key={k} value={k}>
                      {n}
                    </option>
                  ))}
                </select>
                {errText("province")}
              </div>
              <div>
                <label htmlFor={id("city")} className={label}>
                  City
                </label>
                <CityCombobox
                  key={addr.province}
                  id={id("city")}
                  name="city"
                  province={addr.province}
                  value={addr.city}
                  onChange={(c) => setAddr((a) => ({ ...a, city: c }))}
                  className={field}
                  invalidProps={err("city")}
                />
                {errText("city")}
              </div>
              <div>
                <label htmlFor={id("postalCode")} className={label}>
                  Postal code <span className="font-normal text-fg-muted">· optional</span>
                </label>
                <input
                  id={id("postalCode")}
                  value={addr.postalCode}
                  onChange={setA("postalCode")}
                  inputMode="numeric"
                  maxLength={5}
                  className={field}
                  {...err("postalCode")}
                />
                {errText("postalCode")}
              </div>
              {mode === "existing" && customer ? (
                <label className="flex cursor-pointer items-center gap-2 self-end pb-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="size-4 accent-current"
                  />
                  Save to {customer.name.split(" ")[0]}&apos;s addresses
                </label>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* Delivery & payment */}
        <section className={card} aria-labelledby={id("pay-h")}>
          <h2 id={id("pay-h")} className="mb-4 font-extrabold">
            Delivery and payment
          </h2>
          <fieldset id={id("rates")} tabIndex={-1} className="mb-5">
            <legend className={label}>Delivery</legend>
            {q?.rates.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {q.rates.map((r) => (
                  <label key={r.id} className={choice}>
                    <input
                      type="radio"
                      name={id("rate")}
                      checked={(rateId || q.rateId) === r.id}
                      onChange={() => setRateId(r.id)}
                      className="mt-0.5 size-4 accent-current"
                    />
                    <span className="flex-1 text-sm">
                      <span className="flex justify-between gap-2 font-bold">
                        {r.name}
                        <span>{r.price ? formatPKR(r.price) : "Free"}</span>
                      </span>
                      {r.eta ? <span className="block text-[13px] text-fg-muted">{r.eta}</span> : null}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-fg-muted">
                {items.length && ship.city && ship.province
                  ? updating
                    ? "Checking delivery options…"
                    : "No delivery option covers this address. Add a delivery zone in Settings."
                  : "Add items and an address to see delivery options."}
              </p>
            )}
            {errText("rateId")}
          </fieldset>

          <fieldset>
            <legend className={label}>Payment</legend>
            <div className="grid gap-2">
              {[
                ["COD", "Cash on delivery", "The rider collects the money."],
                ["MANUAL", "Already paid", "Bank transfer, JazzCash, Easypaisa or cash."],
                ...(cardAvailable
                  ? [["CARD_LINK", "Card payment link", "Send the customer a link to pay by card or wallet (Safepay)."]]
                  : []),
              ].map(([k, t, hint]) => (
                <label key={k} className={choice}>
                  <input
                    id={id(`pay-${k}`)}
                    type="radio"
                    name={id("payment")}
                    checked={payment === k}
                    onChange={() => setPayment(k)}
                    className="mt-0.5 size-4 accent-current"
                  />
                  <span className="text-sm">
                    <span className="block font-bold">{t}</span>
                    <span className="block text-[13px] text-fg-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {errText("payment")}
            {payment === "MANUAL" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={id("paidVia")} className={label}>
                    Paid by
                  </label>
                  <select
                    id={id("paidVia")}
                    value={paidVia}
                    onChange={(e) => setPaidVia(e.target.value)}
                    className={field}
                  >
                    {PAID_VIA.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={id("paidRef")} className={label}>
                    Reference <span className="font-normal text-fg-muted">· optional</span>
                  </label>
                  <input
                    id={id("paidRef")}
                    value={paidRef}
                    onChange={(e) => setPaidRef(e.target.value)}
                    maxLength={80}
                    placeholder="Transaction ID"
                    className={field}
                  />
                </div>
              </div>
            ) : null}
            {payment === "CARD_LINK" ? (
              <p className="mt-3 rounded-xl bg-info-bg p-3 text-[13px] text-info">
                The order stays &ldquo;Placed&rdquo; until the customer pays. After creating it, use &ldquo;Customer
                link&rdquo; on the order page to copy or WhatsApp the payment link.
              </p>
            ) : null}
          </fieldset>
        </section>

        {/* Discounts & notes */}
        <section className={card} aria-labelledby={id("more-h")}>
          <h2 id={id("more-h")} className="mb-4 font-extrabold">
            Discounts and notes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={id("coupon")} className={label}>
                Voucher code <span className="font-normal text-fg-muted">· optional</span>
              </label>
              <div className="flex gap-2">
                <input
                  id={id("coupon")}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  maxLength={40}
                  className={`${field} font-mono uppercase`}
                  {...err("couponCode")}
                />
                {coupon ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCoupon("");
                      setCouponInput("");
                    }}
                    className="btn-ghost min-h-11 border border-line"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCoupon(couponInput.trim())}
                    disabled={!couponInput.trim()}
                    className="btn-outline min-h-11"
                  >
                    Apply
                  </button>
                )}
              </div>
              {coupon && q && !updating ? (
                <p
                  role="status"
                  className={`mt-1 text-[13px] font-semibold ${q.coupon ? "text-success" : "text-sale"}`}
                >
                  {q.coupon ? `${q.coupon.code} applied` : q.couponMessage}
                </p>
              ) : null}
              {errText("couponCode")}
            </div>
            <div>
              <label htmlFor={id("extraDiscount")} className={label}>
                Extra discount (Rs) <span className="font-normal text-fg-muted">· optional</span>
              </label>
              <input
                id={id("extraDiscount")}
                value={extraDiscount}
                onChange={(e) => setExtraDiscount(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                placeholder="0"
                className={field}
                {...err("extraDiscount")}
              />
              {errText("extraDiscount")}
              {extraDiscount ? (
                <input
                  aria-label="Reason for the extra discount"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  maxLength={200}
                  placeholder="Reason, e.g. Regular customer"
                  className={`${field} mt-2`}
                />
              ) : null}
            </div>
            <div>
              <label htmlFor={id("customerNote")} className={label}>
                Note from the customer <span className="font-normal text-fg-muted">· optional</span>
              </label>
              <textarea
                id={id("customerNote")}
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="e.g. Call before delivery"
                className={`${field} py-2.5`}
              />
            </div>
            <div>
              <label htmlFor={id("adminNote")} className={label}>
                Private note <span className="font-normal text-fg-muted">· only admins see this</span>
              </label>
              <textarea
                id={id("adminNote")}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="e.g. Ordered on WhatsApp"
                className={`${field} py-2.5`}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <section className={card} aria-labelledby={id("sum-h")}>
          <h2 id={id("sum-h")} className="mb-4 font-extrabold">
            Summary
          </h2>
          <dl className="grid gap-1.5 text-sm" aria-live="polite" aria-busy={updating}>
            <Row
              term={`Items (${items.reduce((n, i) => n + i.quantity, 0)})`}
              value={q ? formatPKR(q.subtotal) : "—"}
            />
            {q?.couponDiscount ? (
              <Row term={`Voucher ${q.coupon?.code ?? ""}`} value={`− ${formatPKR(q.couponDiscount)}`} />
            ) : null}
            {q?.extraDiscount ? <Row term="Extra discount" value={`− ${formatPKR(q.extraDiscount)}`} /> : null}
            <Row term="Delivery" value={q?.rateId ? (q.shipping ? formatPKR(q.shipping) : "Free") : "—"} />
            {q?.codFee ? <Row term="COD fee" value={formatPKR(q.codFee)} /> : null}
            {q?.tax?.amount ? (
              <Row term={q.tax.included ? "GST (included)" : "GST"} value={formatPKR(q.tax.amount)} />
            ) : null}
            <div className="mt-2 flex justify-between border-t border-line pt-3 text-lg font-extrabold">
              <dt>Total</dt>
              <dd>{q ? formatPKR(q.grandTotal) : "—"}</dd>
            </div>
          </dl>
          {quoted.data?.problems?.length && !updating ? (
            <ul className="mt-3 grid gap-1 text-[13px] font-semibold text-sale">
              {quoted.data.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : null}

          {payment !== "CARD_LINK" ? (
            <fieldset className="mt-5">
              <legend className={label}>Status after creating</legend>
              <div className="grid gap-2">
                {[
                  ["CONFIRMED", "Confirmed", "Ready to pack."],
                  ["PENDING", "Placed", "Confirm it later from the order page."],
                ].map(([k, t, hint]) => (
                  <label key={k} className={choice}>
                    <input
                      type="radio"
                      name={id("status")}
                      checked={status === k}
                      onChange={() => setStatus(k)}
                      className="mt-0.5 size-4 accent-current"
                    />
                    <span className="text-sm">
                      <span className="font-bold">{t}</span>
                      <span className="block text-[13px] text-fg-muted">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <button type="submit" disabled={creating || !items.length} className="btn-primary mt-5 min-h-12 w-full">
            {creating ? "Creating order…" : "Create order"}
          </button>
          <p className="mt-2 text-[12px] text-fg-muted">
            Stock is reserved straight away. Prices include any running offers.
          </p>
        </section>
      </aside>
    </form>
  );
}

function Row({ term, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-fg-muted">{term}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function ResultList({ query, loading, empty, children }) {
  const hasQuery = query.trim().length >= 2;
  if (!hasQuery) return null;
  const count = Array.isArray(children) ? children.length : 0;
  return (
    <div className="mt-2 rounded-xl border border-line p-1">
      <p role="status" className="sr-only">
        {loading ? "Searching" : `${count} results`}
      </p>
      {loading ? (
        <p className="px-3 py-2 text-[13px] text-fg-muted">Searching…</p>
      ) : count ? (
        <ul className="grid max-h-72 gap-0.5 overflow-y-auto">{children}</ul>
      ) : (
        <p className="px-3 py-2 text-[13px] text-fg-muted">{empty}</p>
      )}
    </div>
  );
}
