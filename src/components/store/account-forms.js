"use client";

import { PasswordInput } from "@/components/ui/password-input";
import { startTransition, useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { changePassword, deleteAddress, saveAddress, setDefaultAddress, updateProfile } from "@/actions/account";
import { CityCombobox } from "@/components/store/city-combobox";
import { formatPhone } from "@/lib/phone";
import { AlertCircle, Check, Plus } from "@/components/ui/icons";

const field =
  "min-h-12 w-full rounded-xl border border-field bg-surface px-3.5 text-[15px] aria-invalid:border-sale disabled:bg-muted disabled:text-fg-muted";
const labelCls = "mb-1.5 block text-[13px] font-bold";

function Result({ state }) {
  if (!state?.message && !(state?.ok === false && Object.keys(state.errors ?? {}).length)) return null;
  return (
    <p
      role="status"
      className={`flex items-start gap-1.5 text-[13px] font-semibold ${state.ok ? "text-success" : "text-sale"}`}
    >
      {state.ok ? <Check className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
      {state.message ?? "Please fix the highlighted fields."}
    </p>
  );
}

function Input({ id, label, hint, error, className = "", ...props }) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelCls}>
        {label}
        {hint ? <span className="font-normal text-fg-muted"> · {hint}</span> : null}
      </label>
      {props.type === "password" ? (
        <PasswordInput
          id={id}
          className={field}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          {...props}
        />
      ) : (
        <input
          id={id}
          className={field}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          {...props}
        />
      )}
      {error ? (
        <p id={`${id}-err`} className="mt-1 flex items-start gap-1 text-[13px] font-semibold text-sale">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** useActionState + submit through a transition (keeps field values on error). */
function useForm(action, { resetOnSuccess = false } = {}) {
  const ref = useRef(null);
  const [state, run, pending] = useActionState(action, null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  const onSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => run(fd));
  };
  return { ref, state, pending, onSubmit, errors: state?.ok === false ? (state.errors ?? {}) : {} };
}

export function ProfileForm({ user }) {
  const uid = useId();
  const { ref, state, pending, onSubmit, errors } = useForm(updateProfile);
  const [phone, setPhone] = useState(formatPhone(user.phone ?? ""));
  return (
    <form ref={ref} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Input
        id={`${uid}-name`}
        name="name"
        label="Name"
        autoComplete="name"
        defaultValue={user.name}
        maxLength={120}
        error={errors.name}
      />
      <Input
        id={`${uid}-phone`}
        name="phone"
        label="Mobile number"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="0300 1234567"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
        error={errors.phone}
      />
      <Input
        id={`${uid}-email`}
        label="Email"
        hint="used to sign in"
        value={user.email}
        disabled
        readOnly
        className="sm:col-span-2"
      />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-ink min-h-12 px-7">
          {pending ? "Saving…" : "Save"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const uid = useId();
  const { ref, state, pending, onSubmit, errors } = useForm(changePassword, { resetOnSuccess: true });
  return (
    <form ref={ref} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Input
        id={`${uid}-cur`}
        name="currentPassword"
        type="password"
        autoComplete="current-password"
        label="Current password"
        className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]"
        error={errors.currentPassword}
      />
      <Input
        id={`${uid}-new`}
        name="newPassword"
        type="password"
        autoComplete="new-password"
        label="New password"
        hint="8 or more characters"
        error={errors.newPassword}
      />
      <Input
        id={`${uid}-conf`}
        name="confirm"
        type="password"
        autoComplete="new-password"
        label="Type it again"
        error={errors.confirm}
      />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-ink min-h-12 px-7">
          {pending ? "Changing…" : "Change password"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

function AddressForm({ address, provinces, onDone }) {
  const uid = useId();
  const { ref, state, pending, onSubmit, errors } = useForm(saveAddress);
  const [province, setProvince] = useState(address?.province ?? "");
  const [city, setCity] = useState(address?.city ?? "");
  const [phone, setPhone] = useState(formatPhone(address?.phone ?? ""));
  useEffect(() => {
    if (state?.ok) onDone(state.message);
  }, [state, onDone]);

  return (
    <form ref={ref} onSubmit={onSubmit} noValidate className="grid gap-4 rounded-2xl bg-muted p-5 sm:grid-cols-2">
      {address ? <input type="hidden" name="id" value={address.id} /> : null}
      <Input
        id={`${uid}-label`}
        name="label"
        label="Label"
        hint="optional"
        placeholder="Home, Office, Ammi's house"
        defaultValue={address?.label ?? ""}
        maxLength={40}
        error={errors.label}
      />
      <Input
        id={`${uid}-name`}
        name="fullName"
        label="Full name"
        autoComplete="name"
        defaultValue={address?.fullName ?? ""}
        maxLength={120}
        error={errors.fullName}
      />
      <Input
        id={`${uid}-phone`}
        name="phone"
        label="Mobile number"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="0300 1234567"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
        error={errors.phone}
      />
      <Input
        id={`${uid}-line1`}
        name="line1"
        label="Address"
        autoComplete="address-line1"
        placeholder="House 12, Street 4"
        defaultValue={address?.line1 ?? ""}
        maxLength={255}
        error={errors.line1}
      />
      <Input
        id={`${uid}-line2`}
        name="line2"
        label="Area, block or landmark"
        hint="optional"
        autoComplete="address-line2"
        defaultValue={address?.line2 ?? ""}
        maxLength={255}
        error={errors.line2}
      />
      <div>
        <label htmlFor={`${uid}-prov`} className={labelCls}>
          Province
        </label>
        <select
          id={`${uid}-prov`}
          name="province"
          value={province}
          onChange={(e) => {
            setProvince(e.target.value);
            setCity("");
          }}
          className={field}
          aria-invalid={errors.province ? true : undefined}
        >
          <option value="">Choose…</option>
          {Object.entries(provinces).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        {errors.province ? <p className="mt-1 text-[13px] font-semibold text-sale">{errors.province}</p> : null}
      </div>
      <div>
        <label htmlFor={`${uid}-city`} className={labelCls}>
          City
        </label>
        <CityCombobox
          key={province}
          id={`${uid}-city`}
          name="city"
          province={province}
          value={city}
          onChange={setCity}
          className={field}
          invalidProps={errors.city ? { "aria-invalid": true } : {}}
        />
        {errors.city ? <p className="mt-1 text-[13px] font-semibold text-sale">{errors.city}</p> : null}
      </div>
      <Input
        id={`${uid}-post`}
        name="postalCode"
        label="Postal code"
        hint="optional"
        inputMode="numeric"
        autoComplete="postal-code"
        defaultValue={address?.postalCode ?? ""}
        maxLength={5}
        error={errors.postalCode}
      />
      <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm font-semibold sm:col-span-2">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={address?.isDefault ?? false}
          className="size-5 accent-current"
        />
        Use this address at checkout
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn-ink min-h-12 px-7">
          {pending ? "Saving…" : address ? "Save address" : "Add address"}
        </button>
        <button type="button" onClick={() => onDone(null)} className="btn-ghost min-h-12">
          Cancel
        </button>
        <Result state={state?.ok ? null : state} />
      </div>
    </form>
  );
}

export function AddressBook({ addresses, provinces, max }) {
  const [editing, setEditing] = useState(null); // address id | "new" | null
  const [notice, setNotice] = useState(null);
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(null);
  const finish = (msg) => {
    setEditing(null);
    setNotice(msg);
  };
  const run = (fn) =>
    start(async () => {
      const res = await fn();
      setNotice(res?.ok ? null : (res?.message ?? null));
      setConfirm(null);
    });

  return (
    <div className="grid gap-3">
      {notice ? (
        <p role="status" className="flex items-center gap-2 text-sm font-semibold text-success">
          <Check className="size-4" /> {notice}
        </p>
      ) : null}
      {addresses.length === 0 && editing !== "new" ? (
        <p className="text-fg-muted">
          No saved addresses yet. The address you use at checkout is saved here automatically.
        </p>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {addresses.map((a) =>
          editing === a.id ? (
            <li key={a.id} className="sm:col-span-2">
              <AddressForm address={a} provinces={provinces} onDone={finish} />
            </li>
          ) : (
            <li key={a.id} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-bold">{a.label || "Address"}</span>
                {a.isDefault ? (
                  <span className="rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-bold text-success">
                    Used at checkout
                  </span>
                ) : null}
              </p>
              <address className="mt-2 flex-1 text-sm text-fg-muted not-italic">
                {a.fullName} · {formatPhone(a.phone)}
                <br />
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.city}, {provinces[a.province]}
                {a.postalCode ? ` ${a.postalCode}` : ""}
              </address>
              <div className="mt-3 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setNotice(null);
                    setEditing(a.id);
                  }}
                  className="btn-ghost min-h-10 text-sm"
                >
                  Edit
                </button>
                {!a.isDefault ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setDefaultAddress(a.id))}
                    className="btn-ghost min-h-10 text-sm"
                  >
                    Use at checkout
                  </button>
                ) : null}
                {confirm === a.id ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => deleteAddress(a.id))}
                      className="btn-ghost min-h-10 text-sm text-sale"
                    >
                      Yes, remove
                    </button>
                    <button type="button" onClick={() => setConfirm(null)} className="btn-ghost min-h-10 text-sm">
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirm(a.id)}
                    className="btn-ghost min-h-10 text-sm text-sale"
                    aria-label={`Remove ${a.label || "address"}: ${a.line1}`}
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ),
        )}
      </ul>
      {editing === "new" ? (
        <AddressForm provinces={provinces} onDone={finish} />
      ) : addresses.length < max ? (
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setEditing("new");
          }}
          className="btn-outline min-h-12 justify-self-start"
        >
          <Plus className="size-4" /> Add an address
        </button>
      ) : null}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await authClient.signOut();
          router.replace("/");
          router.refresh();
        })
      }
      className="btn-outline min-h-12"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
