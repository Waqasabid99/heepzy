"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { requestReturn } from "@/actions/returns";
import { AlertCircle, Video } from "@/components/ui/icons";
import { ReturnMediaUploader } from "@/components/store/return-media-uploader";

const REASONS = [
  ["WRONG_SIZE", "Wrong size"],
  ["DEFECTIVE", "Faulty or damaged"],
  ["NOT_AS_DESCRIBED", "Not as described"],
  ["WRONG_ITEM", "Wrong item sent"],
  ["CHANGED_MIND", "Changed my mind"],
  ["OTHER", "Other"],
];
const field = "w-full rounded-xl border border-field bg-surface px-3.5 text-[15px] aria-invalid:border-sale";
const choice =
  "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line px-4 py-3 has-checked:border-fg has-checked:bg-muted has-focus-visible:outline-2 has-focus-visible:outline-ring";

/** Pick items, reason, exchange or refund. */
export function ReturnRequestForm({ orderNumber, token, items, refundsEnabled }) {
  const uid = useId();
  const [state, action, pending] = useActionState(requestReturn, null);
  const errors = state?.ok === false ? (state.errors ?? {}) : {};
  const [qty, setQty] = useState(() => Object.fromEntries(items.map((i) => [i.id, items.length === 1 ? 1 : 0])));
  const [resolution, setResolution] = useState("EXCHANGE");
  const [reason, setReason] = useState("");
  const [media, setMedia] = useState([]);
  const needsEvidence = ["DEFECTIVE", "WRONG_ITEM", "NOT_AS_DESCRIBED"].includes(reason);
  const formRef = useRef(null);

  // After a failed submit, bring the first problem into view and focus it.
  useEffect(() => {
    if (state?.ok !== false) return;
    const target = formRef.current?.querySelector('[role="alert"], [aria-invalid="true"], [data-error]');
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (target.matches("input, select, textarea")) target.focus({ preventScroll: true });
  }, [state]);

  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("items", JSON.stringify(Object.entries(qty).map(([orderItemId, quantity]) => ({ orderItemId, quantity }))));
    fd.set("media", JSON.stringify(media));
    startTransition(() => action(fd));
  };
  const err = (k) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${uid}-${k}-err` } : {});
  const errText = (k) =>
    errors[k] ? (
      <p
        id={`${uid}-${k}-err`}
        data-error
        className="mt-2 flex items-start gap-1.5 text-[13px] font-semibold text-sale"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        {errors[k]}
      </p>
    ) : null;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="grid gap-6">
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="token" value={token} />
      {state?.message ? (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-bg p-4 text-sm font-semibold text-sale">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      ) : null}

      <fieldset>
        <legend className="mb-3 text-lg font-extrabold">What are you returning?</legend>
        <ul className="grid gap-3">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3">
              <span className="relative size-16 shrink-0 overflow-hidden bg-muted">
                {it.imageUrl ? <Image src={it.imageUrl} alt="" fill sizes="64px" className="object-cover" /> : null}
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-bold">{it.productName}</span>
                <span className="block text-fg-muted">
                  {it.color} · Size {it.size}
                </span>
              </span>
              <label className="sr-only" htmlFor={`${uid}-q-${it.id}`}>
                Quantity of {it.productName} to return
              </label>
              <select
                id={`${uid}-q-${it.id}`}
                value={qty[it.id]}
                onChange={(e) => setQty({ ...qty, [it.id]: Number(e.target.value) })}
                className="min-h-11 w-20 shrink-0 rounded-xl border border-field bg-surface px-3 text-[15px]"
              >
                {Array.from({ length: it.max + 1 }, (_, n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
        {errText("items")}
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-lg font-extrabold">Why?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {REASONS.map(([value, text]) => (
            <label key={value} className={choice}>
              <input
                type="radio"
                name="reason"
                value={value}
                checked={reason === value}
                onChange={() => setReason(value)}
                className="size-4 accent-current"
                {...err("reason")}
              />
              <span className="text-sm font-semibold">{text}</span>
            </label>
          ))}
        </div>
        {errText("reason")}
      </fieldset>

      {needsEvidence ? (
        <p className="flex items-start gap-3 rounded-xl bg-info-bg p-4 text-sm text-info">
          <Video className="mt-0.5 size-5 shrink-0" />
          <span>
            <span className="font-bold">Please show us the problem.</span> Add clear photos and, if you have it, the
            unboxing video you recorded when the parcel arrived. It helps us approve your return quickly.
          </span>
        </p>
      ) : null}
      <ReturnMediaUploader
        orderNumber={orderNumber}
        token={token}
        onChange={setMedia}
        required={needsEvidence}
        error={errors.media}
        errorId={`${uid}-media-err`}
      />

      <fieldset>
        <legend className="mb-3 text-lg font-extrabold">What would you like?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["EXCHANGE", "Exchange", "A different size or colour of the same shoe."],
            ...(refundsEnabled ? [["REFUND", "Refund", "Your money back once we receive the shoes."]] : []),
          ].map(([value, title, hint]) => (
            <label key={value} className={`${choice} items-start`}>
              <input
                type="radio"
                name="resolution"
                value={value}
                checked={resolution === value}
                onChange={() => setResolution(value)}
                className="mt-0.5 size-4 accent-current"
              />
              <span>
                <span className="block text-sm font-bold">{title}</span>
                <span className="block text-[13px] text-fg-muted">{hint}</span>
              </span>
            </label>
          ))}
        </div>
        {errText("resolution")}
      </fieldset>

      <div>
        <label htmlFor={`${uid}-note`} className="mb-2 block text-lg font-extrabold">
          {resolution === "EXCHANGE" ? "Which size or colour would you like?" : "Anything else we should know?"}
          {resolution === "EXCHANGE" ? null : <span className="text-sm font-normal text-fg-muted"> · optional</span>}
        </label>
        <textarea
          id={`${uid}-note`}
          name="note"
          rows={3}
          maxLength={1000}
          placeholder={resolution === "EXCHANGE" ? "e.g. Size 40 in the same colour" : ""}
          className={`${field} py-3`}
          {...err("note")}
        />
        {errText("note")}
      </div>

      <div>
        <button type="submit" disabled={pending} className="btn-primary min-h-12 px-8">
          {pending ? "Sending…" : "Send return request"}
        </button>
        <p className="mt-2 text-[13px] text-fg-muted">
          We&apos;ll call or WhatsApp you to arrange the pickup. Shoes should be unworn and in their box.
        </p>
      </div>
    </form>
  );
}
