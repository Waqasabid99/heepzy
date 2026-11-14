"use client";

import { startTransition, useActionState, useState } from "react";
import { setCustomerBan, setUserRole } from "@/actions/admin/customers";
import { AlertCircle, Check } from "@/components/ui/icons";

/** Block / unblock panel on the customer page. */
export function CustomerActions({ userId, banned, banReason }) {
  const [state, action, pending] = useActionState(setCustomerBan, null);
  const [confirming, setConfirming] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
    setConfirming(false);
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="ca-title">
      <h2 id="ca-title" className="mb-2 font-extrabold">
        Account access
      </h2>
      {banned ? (
        <form onSubmit={submit} className="grid gap-3">
          <p className="text-[13px] text-sale">
            <span className="font-bold">Blocked.</span> {banReason}
          </p>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="intent" value="unban" />
          <button type="submit" disabled={pending} className="btn-outline min-h-11 w-full">
            Unblock account
          </button>
        </form>
      ) : confirming ? (
        <form onSubmit={submit} className="grid gap-3 rounded-xl bg-danger-bg p-3">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="intent" value="ban" />
          <p className="text-[13px] font-semibold text-sale">
            They&apos;ll be signed out everywhere and can&apos;t sign in. Existing orders aren&apos;t affected.
          </p>
          <div>
            <label htmlFor="ca-reason" className="mb-1 block text-[13px] font-bold">
              Reason <span className="font-normal">(only admins see this)</span>
            </label>
            <input
              id="ca-reason"
              name="reason"
              maxLength={255}
              placeholder="e.g. Repeated fake COD orders"
              className="min-h-11 w-full rounded-xl border border-field bg-surface px-3 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="btn min-h-11 flex-1 bg-sale text-white hover:opacity-90"
            >
              Yes, block
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="btn-ghost min-h-11">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="mb-3 text-[13px] text-fg-muted">
            Block accounts that place fake orders or abuse vouchers. You can unblock at any time.
          </p>
          <button type="button" onClick={() => setConfirming(true)} className="btn-ghost min-h-11 w-full text-sale">
            Block account
          </button>
        </>
      )}
      {state?.message ? (
        <p
          role="status"
          className={`mt-3 flex items-start gap-1.5 text-[13px] font-semibold ${state.ok ? "text-success" : "text-sale"}`}
        >
          {state.ok ? <Check className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
          {state.message}
        </p>
      ) : null}
    </section>
  );
}

const ROLE_HINTS = {
  user: "Shops on the store. No admin access.",
  manager: "Runs the store: orders, customers, products, stock, offers, vouchers and settings.",
  admin: "Owner access: everything, including staff accounts and the audit log.",
};

/** Owner only: change an account's role. */
export function RoleActions({ userId, role }) {
  const [state, action, pending] = useActionState(setUserRole, null);
  const [next, setNext] = useState(role);
  const staff = next === "manager" || next === "admin";

  return (
    <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="ra-title">
      <h2 id="ra-title" className="mb-1 font-extrabold">
        Role
      </h2>
      <p className="mb-3 text-[13px] text-fg-muted">Only you (the owner) can change this.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => action(fd));
        }}
        className="grid gap-2"
      >
        <input type="hidden" name="userId" value={userId} />
        {[
          ["user", "Customer"],
          ["manager", "Manager"],
          ["admin", "Admin (owner)"],
        ].map(([value, text]) => (
          <label
            key={value}
            className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 has-checked:border-fg has-checked:bg-muted"
          >
            <input
              type="radio"
              name="role"
              value={value}
              checked={next === value}
              onChange={() => setNext(value)}
              className="mt-0.5 size-4 accent-current"
            />
            <span className="text-sm">
              <span className="font-bold">{text}</span>
              <span className="block text-[12px] text-fg-muted">{ROLE_HINTS[value]}</span>
            </span>
          </label>
        ))}
        {staff && next !== role ? (
          <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-warning-bg p-3 text-[13px] font-semibold text-warning">
            <input type="checkbox" name="confirm" className="mt-0.5 size-4 accent-current" />I trust this person with{" "}
            {next === "admin" ? "full owner access" : "running the store"}.
          </label>
        ) : null}
        <button type="submit" disabled={pending || next === role} className="btn-outline min-h-11 w-full">
          {pending ? "Saving…" : "Change role"}
        </button>
      </form>
      {state?.message ? (
        <p
          role="status"
          className={`mt-3 flex items-start gap-1.5 text-[13px] font-semibold ${state.ok ? "text-success" : "text-sale"}`}
        >
          {state.ok ? <Check className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
