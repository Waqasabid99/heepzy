"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import { removeSafepayKeys, saveSafepayKeys, testSafepayConnection } from "@/actions/admin/payment-keys";
import { AlertCircle, Check } from "@/components/ui/icons";
import { Field } from "@/components/admin/settings-forms";

function Result({ state }) {
  if (!state?.message && !(state?.ok === false && Object.keys(state.errors ?? {}).length)) return null;
  return (
    <p
      role="status"
      className={`flex items-start gap-1.5 text-[13px] font-semibold ${state.ok ? "text-success" : "text-sale"}`}
    >
      {state.ok ? <Check className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
      {state.message ?? "Please fix the highlighted field."}
    </p>
  );
}

/** Submit a form through an action; clear it (secrets and password) when the action succeeds. */
function useSecretForm(action) {
  const ref = useRef(null);
  const [state, run, pending] = useActionState(action, null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  const onSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => run(fd));
  };
  return { ref, state, pending, onSubmit, errors: state?.ok === false ? (state.errors ?? {}) : {} };
}

const secretInput = { type: "password", autoComplete: "off", spellCheck: false, autoCapitalize: "off" };

/**
 * Owner-only: enter or replace the Safepay keys. Saved keys are never shown;
 * blank fields keep what's saved.
 */
export function SafepayKeysForm({ status }) {
  const uid = useId();
  const { ref, state, pending, onSubmit, errors } = useSecretForm(saveSafepayKeys);
  const [mode, setMode] = useState(status.environment ?? "sandbox");
  const saved = status.source === "admin";
  const keep = (hint) => (saved && hint ? `Leave blank to keep the key ending ${hint}` : "");

  return (
    <form ref={ref} onSubmit={onSubmit} noValidate className="grid gap-4" aria-labelledby={`${uid}-t`}>
      <div>
        <h3 id={`${uid}-t`} className="font-extrabold">
          {saved ? "Replace keys" : "Add Safepay keys"}
        </h3>
        <p className="mt-1 text-[13px] text-fg-muted">
          From your Safepay dashboard: Developers → API keys, and Endpoints for the webhook secret. Keys are checked
          with Safepay before they&apos;re saved and can&apos;t be viewed again.
        </p>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[13px] font-bold">Mode</legend>
        <div className="flex flex-wrap gap-2">
          {[
            ["sandbox", "Sandbox (test payments)"],
            ["production", "Live (real payments)"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-4 has-checked:border-fg has-checked:bg-muted has-focus-visible:outline-2 has-focus-visible:outline-ring"
            >
              <input
                type="radio"
                name="environment"
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
                className="size-4 accent-current"
              />
              <span className="text-sm font-semibold">{label}</span>
            </label>
          ))}
        </div>
        {mode === "production" && status.environment !== "production" ? (
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-warning-bg p-3 text-[13px] text-warning">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            Live mode charges real cards. Use your live keys, not the sandbox ones.
          </p>
        ) : null}
      </fieldset>

      <Field
        id={`${uid}-pk`}
        name="publicKey"
        label="Public key"
        placeholder={keep(status.publicKeyHint)}
        error={errors.publicKey}
        {...secretInput}
      />
      <Field
        id={`${uid}-sk`}
        name="secretKey"
        label="Secret key"
        placeholder={keep(status.secretHint)}
        error={errors.secretKey}
        {...secretInput}
      />
      <Field
        id={`${uid}-wh`}
        name="webhookSecret"
        label="Webhook secret"
        hint="recommended"
        placeholder={keep(status.webhookHint)}
        error={errors.webhookSecret}
        {...secretInput}
      />
      <Field
        id={`${uid}-pw`}
        name="password"
        type="password"
        autoComplete="current-password"
        label="Your password"
        hint="to confirm it's you"
        className="max-w-sm"
        error={errors.password}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-ink min-h-11">
          {pending ? "Checking with Safepay…" : "Test and save"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

/** Owner-only: check the keys in use against Safepay. */
export function SafepayTestButton() {
  const [state, run, pending] = useActionState(testSafepayConnection, null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => startTransition(() => run())}
        disabled={pending}
        className="btn-outline min-h-11"
      >
        {pending ? "Testing…" : "Test connection"}
      </button>
      <Result state={state} />
    </div>
  );
}

/** Owner-only: delete the saved keys (also switches card payments off). */
export function SafepayRemoveForm() {
  const uid = useId();
  const { ref, state, pending, onSubmit, errors } = useSecretForm(removeSafepayKeys);
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost min-h-11 text-sm text-sale">
        Remove saved keys…
      </button>
    );
  }
  return (
    <form ref={ref} onSubmit={onSubmit} noValidate className="grid gap-3 rounded-xl bg-danger-bg p-4">
      <p className="text-[13px] font-semibold text-sale">
        Card payments will be switched off until new keys are added.
      </p>
      <Field
        id={`${uid}-pw`}
        name="password"
        type="password"
        autoComplete="current-password"
        label="Your password"
        className="max-w-sm"
        error={errors.password}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-ink min-h-11">
          {pending ? "Removing…" : "Remove keys"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost min-h-11 text-sm">
          Cancel
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}
