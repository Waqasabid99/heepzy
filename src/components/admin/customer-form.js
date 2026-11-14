"use client";

import { startTransition, useActionState, useId, useState } from "react";
import { createCustomer } from "@/actions/admin/customers";
import { ErrorSummary } from "@/components/admin/error-summary";
import { CityCombobox } from "@/components/store/city-combobox";
import { formatPhone } from "@/lib/phone";
import { isListedCity } from "@/lib/pk-cities";
import { AlertCircle } from "@/components/ui/icons";

const field =
  "min-h-11 w-full rounded-xl border border-field bg-surface px-3.5 text-sm text-fg aria-invalid:border-sale";
const label = "mb-1.5 block text-[13px] font-bold";
const card = "rounded-2xl border border-line bg-surface p-5 sm:p-6";

const LABELS = {
  name: "Name",
  email: "Email",
  phone: "Mobile number",
  password: "Password",
  confirmStaff: "Staff access",
  addressPhone: "Delivery phone",
  line1: "Address",
  city: "City",
  province: "Province",
  postalCode: "Postal code",
};

/** Create a customer (or staff) account, optionally with a saved delivery address. */
export function CustomerForm({ provinces, canCreateStaff = false }) {
  const uid = useId();
  const [state, action, saving] = useActionState(createCustomer, null);
  const errors = state?.ok === false ? (state.errors ?? {}) : {};
  const [phone, setPhone] = useState("");
  const [addressPhone, setAddressPhone] = useState("");
  const [role, setRole] = useState("user");
  const [addAddress, setAddAddress] = useState(false);
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");

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
    <form onSubmit={onSubmit} noValidate className="grid max-w-3xl gap-5">
      {state?.ok === false ? (
        <ErrorSummary message={state.message} errors={errors} labels={LABELS} targetFor={(k) => id(k)} />
      ) : null}

      <section className={card} aria-labelledby={id("acc-h")}>
        <h2 id={id("acc-h")} className="mb-4 font-extrabold">
          Account
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={id("name")} className={label}>
              Full name
            </label>
            <input id={id("name")} name="name" autoComplete="off" maxLength={120} className={field} {...err("name")} />
            {errText("name")}
          </div>
          <div>
            <label htmlFor={id("email")} className={label}>
              Email
            </label>
            <input
              id={id("email")}
              name="email"
              type="email"
              autoComplete="off"
              maxLength={191}
              className={field}
              {...err("email")}
            />
            {errText("email")}
          </div>
          <div>
            <label htmlFor={id("phone")} className={label}>
              Mobile number <span className="font-normal text-fg-muted">· optional</span>
            </label>
            <input
              id={id("phone")}
              name="phone"
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
          <div>
            <label htmlFor={id("password")} className={label}>
              Password <span className="font-normal text-fg-muted">· optional</span>
            </label>
            <input
              id={id("password")}
              name="password"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              className={field}
              aria-describedby={errors.password ? `${id("password")}-err` : id("pw-hint")}
              aria-invalid={errors.password ? true : undefined}
            />
            <p id={id("pw-hint")} className="mt-1 text-[12px] text-fg-muted">
              Leave empty for customers who order by phone or WhatsApp. They can set one later with &ldquo;Forgot
              password&rdquo;.
            </p>
            {errText("password")}
          </div>
        </div>

        {canCreateStaff ? (
          <fieldset className="mt-5">
            <legend className={label}>Account type</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                ["user", "Customer", "Shops on the store."],
                ["manager", "Manager", "Runs the store: orders, customers, products, stock and settings."],
                ["admin", "Admin (owner)", "Everything, including staff accounts and the audit log."],
              ].map(([value, title, hint]) => (
                <label
                  key={value}
                  className="flex cursor-pointer gap-3 rounded-xl border border-line p-3.5 has-checked:border-fg has-checked:bg-muted"
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={role === value}
                    onChange={() => setRole(value)}
                    className="mt-0.5 size-4 accent-current"
                  />
                  <span>
                    <span className="block text-sm font-bold">{title}</span>
                    <span className="block text-[13px] text-fg-muted">{hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {role !== "user" ? (
              <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl bg-danger-bg p-3.5 text-sale">
                <input
                  id={id("confirmStaff")}
                  type="checkbox"
                  name="confirmStaff"
                  className="mt-0.5 size-4 accent-current"
                  {...err("confirmStaff")}
                />
                <span className="text-[13px] font-semibold">
                  {role === "admin"
                    ? "I understand this person gets full owner access, including managing staff."
                    : "I understand this person can see all orders and customers, and change products, prices, stock and settings."}
                </span>
              </label>
            ) : null}
            {errText("confirmStaff")}
          </fieldset>
        ) : (
          <input type="hidden" name="role" value="user" />
        )}
      </section>

      <section className={card} aria-labelledby={id("addr-h")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id={id("addr-h")} className="font-extrabold">
            Delivery address
          </h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              name="addAddress"
              checked={addAddress}
              onChange={(e) => setAddAddress(e.target.checked)}
              className="size-4 accent-current"
            />
            Save an address now
          </label>
        </div>
        {addAddress ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={id("fullName")} className={label}>
                Recipient <span className="font-normal text-fg-muted">· if not the customer</span>
              </label>
              <input id={id("fullName")} name="fullName" maxLength={120} className={field} />
            </div>
            <div>
              <label htmlFor={id("addressPhone")} className={label}>
                Delivery phone <span className="font-normal text-fg-muted">· if different</span>
              </label>
              <input
                id={id("addressPhone")}
                name="addressPhone"
                type="tel"
                inputMode="tel"
                value={addressPhone}
                onChange={(e) => setAddressPhone(formatPhone(e.target.value))}
                maxLength={16}
                placeholder="0300 1234567"
                className={field}
                {...err("addressPhone")}
              />
              {errText("addressPhone")}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={id("line1")} className={label}>
                House number, street
              </label>
              <input id={id("line1")} name="line1" maxLength={255} className={field} {...err("line1")} />
              {errText("line1")}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={id("line2")} className={label}>
                Area, block or landmark <span className="font-normal text-fg-muted">· optional</span>
              </label>
              <input id={id("line2")} name="line2" maxLength={255} className={field} />
            </div>
            <div>
              <label htmlFor={id("province")} className={label}>
                Province
              </label>
              <select
                id={id("province")}
                name="province"
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  if (!isListedCity(e.target.value, city)) setCity("");
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
                key={province}
                id={id("city")}
                name="city"
                province={province}
                value={city}
                onChange={setCity}
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
                name="postalCode"
                inputMode="numeric"
                maxLength={5}
                className={field}
                {...err("postalCode")}
              />
              {errText("postalCode")}
            </div>
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-fg-muted">You can also enter the address when creating their order.</p>
        )}
      </section>

      <div>
        <button type="submit" disabled={saving} className="btn-primary min-h-12 px-8">
          {saving ? "Creating…" : role === "user" ? "Create customer" : "Create staff account"}
        </button>
      </div>
    </form>
  );
}
