"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import {
  approveReturn,
  cancelReturnByAdmin,
  completeReturn,
  receiveReturn,
  refundReturn,
  rejectReturn,
  saveReturnNote,
  recordOrderRefund,
} from "@/actions/admin/returns";
import { formatPKR } from "@/lib/money";
import { AlertCircle, Check } from "@/components/ui/icons";

const field = "min-h-11 w-full rounded-xl border border-field bg-surface px-3 text-sm aria-invalid:border-sale";
const labelCls = "mb-1 block text-[13px] font-bold";
const box = "rounded-2xl border border-line bg-surface p-5";

export const REFUND_METHODS = [
  ["BANK_TRANSFER", "Bank transfer"],
  ["WALLET_TRANSFER", "JazzCash / Easypaisa"],
  ["CASH", "Cash"],
  ["ORIGINAL_PAYMENT", "Back to card (done in Safepay)"],
];

function Result({ state }) {
  if (!state?.message) return null;
  return (
    <p
      role="status"
      className={`flex items-start gap-1.5 text-[13px] font-semibold ${state.ok ? "text-success" : "text-sale"}`}
    >
      {state.ok ? <Check className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
      {state.message}
    </p>
  );
}

/** Next steps for a return, depending on its status. */
export function ReturnActions({ ret }) {
  const uid = useId();
  const [pending, start] = useTransition();
  const [state, setState] = useState(null);
  const [mode, setMode] = useState(null); // "reject" | "cancel" | null
  const [message, setMessage] = useState("");
  const [conditions, setConditions] = useState(() =>
    Object.fromEntries(ret.items.map((i) => [i.id, { condition: "UNWORN", restock: true }])),
  );
  const [refund, setRefund] = useState({
    amount: String(ret.suggestedRefund || ""),
    method: ret.order.paymentMethod === "CARD" ? "ORIGINAL_PAYMENT" : "BANK_TRANSFER",
    reference: "",
  });
  const run = (fn) =>
    start(async () => {
      const res = await fn();
      setState(res);
      if (res?.ok) setMessage(""); // the note belongs to the step that just finished
    });
  const errors = state?.ok === false ? (state.errors ?? {}) : {};

  return (
    <section className={box} aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`} className="mb-3 font-extrabold">
        Next step
      </h2>

      {ret.status === "REQUESTED" ? (
        <div className="grid gap-3">
          <label htmlFor={`${uid}-msg`} className={labelCls}>
            Note <span className="font-normal text-fg-muted">· optional for approval, required to reject</span>
          </label>
          <textarea
            id={`${uid}-msg`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="e.g. Rider will collect on Saturday"
            className={`${field} py-2`}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => approveReturn(ret.id, message))}
            className="btn-ink min-h-11 w-full"
          >
            Approve return
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => rejectReturn(ret.id, message))}
            className="btn-ghost min-h-10 w-full text-sm text-sale"
          >
            Reject
          </button>
        </div>
      ) : null}

      {ret.status === "APPROVED" || ret.status === "IN_TRANSIT" ? (
        <div className="grid gap-4">
          <p className="text-[13px] text-fg-muted">When the shoes arrive, check them and record their condition.</p>
          {ret.items.map((i) => (
            <fieldset key={i.id} className="rounded-xl bg-muted p-3">
              <legend className="sr-only">
                {i.orderItem.productName}, size {i.orderItem.size}
              </legend>
              <p className="mb-2 text-sm font-bold">
                {i.orderItem.productName} · {i.orderItem.size} × {i.quantity}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ["UNWORN", "Unworn"],
                  ["WORN", "Worn"],
                  ["DAMAGED", "Damaged"],
                ].map(([v, t]) => (
                  <label
                    key={v}
                    className="inline-flex min-h-9 cursor-pointer items-center rounded-full border border-line bg-surface px-3 text-[13px] font-semibold has-checked:border-fg has-checked:bg-fg has-checked:text-bg"
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={`${uid}-${i.id}`}
                      checked={conditions[i.id].condition === v}
                      onChange={() =>
                        setConditions({ ...conditions, [i.id]: { condition: v, restock: v === "UNWORN" } })
                      }
                    />
                    {t}
                  </label>
                ))}
              </div>
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-[13px] font-semibold">
                <input
                  type="checkbox"
                  checked={conditions[i.id].restock}
                  disabled={!i.orderItem.variantId}
                  onChange={(e) =>
                    setConditions({ ...conditions, [i.id]: { ...conditions[i.id], restock: e.target.checked } })
                  }
                  className="size-4 accent-current"
                />
                Put back in stock
              </label>
            </fieldset>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() =>
                receiveReturn({
                  returnId: ret.id,
                  items: Object.entries(conditions).map(([returnItemId, c]) => ({ returnItemId, ...c })),
                }),
              )
            }
            className="btn-ink min-h-11 w-full"
          >
            Mark as received
          </button>
        </div>
      ) : null}

      {ret.status === "RECEIVED" ? (
        <div className="grid gap-4">
          {ret.resolution === "EXCHANGE" ? (
            <div className="grid gap-2 rounded-xl bg-muted p-3 text-[13px]">
              <p>
                The customer wants an exchange
                {ret.customerNote ? (
                  <>
                    : <span className="font-semibold">&ldquo;{ret.customerNote}&rdquo;</span>
                  </>
                ) : null}
                .
              </p>
              <Link
                href={`/admin/orders/new${ret.order.userId ? `?customer=${ret.order.userId}` : ""}`}
                className="btn-outline min-h-10 text-sm"
              >
                Create replacement order
              </Link>
              <p className="text-fg-muted">
                Tip: give it a full extra discount so the customer isn&apos;t charged again.
              </p>
              <label htmlFor={`${uid}-ex`} className={labelCls}>
                Note <span className="font-normal text-fg-muted">· optional, e.g. the new order number</span>
              </label>
              <input
                id={`${uid}-ex`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                className={field}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => completeReturn(ret.id, message))}
                className="btn-ink min-h-11"
              >
                Complete exchange
              </button>
            </div>
          ) : null}

          <RefundFields
            uid={uid}
            refund={refund}
            setRefund={setRefund}
            errors={errors}
            max={ret.refundableLeft}
            title={ret.resolution === "EXCHANGE" ? "Or refund instead" : "Refund"}
          />
          <button
            type="button"
            disabled={pending || !(ret.refundableLeft > 0)}
            onClick={() => run(() => refundReturn(ret.id, refund))}
            className={`${ret.resolution === "REFUND" ? "btn-ink" : "btn-outline"} min-h-11 w-full`}
          >
            Record refund and complete
          </button>
          {ret.resolution === "REFUND" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => completeReturn(ret.id, "Completed without a refund"))}
              className="btn-ghost min-h-10 w-full text-sm"
            >
              Complete without refund
            </button>
          ) : null}
        </div>
      ) : null}

      {["COMPLETED", "REJECTED", "CANCELLED"].includes(ret.status) ? (
        <p className="text-sm text-fg-muted">This return is closed.</p>
      ) : null}

      {["REQUESTED", "APPROVED", "IN_TRANSIT"].includes(ret.status) ? (
        mode === "cancel" ? (
          <div className="mt-3 grid gap-2 rounded-xl bg-danger-bg p-3">
            <p className="text-[13px] font-semibold text-sale">
              Cancel this return? (e.g. the customer changed their mind)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => cancelReturnByAdmin(ret.id, message))}
                className="btn min-h-10 flex-1 bg-sale text-sm text-white hover:opacity-90"
              >
                Yes, cancel
              </button>
              <button type="button" onClick={() => setMode(null)} className="btn-ghost min-h-10">
                Keep
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setMode("cancel")} className="btn-ghost mt-2 min-h-10 w-full text-sm">
            Cancel return
          </button>
        )
      ) : null}

      <div className="mt-3">
        <Result state={state} />
      </div>
    </section>
  );
}

function RefundFields({ uid, refund, setRefund, errors, max, title }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-extrabold">{title}</legend>
      <p className="text-[12px] text-fg-muted">
        Send the money first (bank, wallet, cash, or in the Safepay dashboard), then record it here. Up to{" "}
        {formatPKR(max)} can be refunded.
      </p>
      <div>
        <label htmlFor={`${uid}-amt`} className={labelCls}>
          Amount (Rs)
        </label>
        <input
          id={`${uid}-amt`}
          inputMode="decimal"
          value={refund.amount}
          onChange={(e) => setRefund({ ...refund, amount: e.target.value.replace(/[^\d.]/g, "") })}
          className={field}
          aria-invalid={errors.amount ? true : undefined}
        />
        {errors.amount ? <p className="mt-1 text-[13px] font-semibold text-sale">{errors.amount}</p> : null}
      </div>
      <div>
        <label htmlFor={`${uid}-method`} className={labelCls}>
          Sent by
        </label>
        <select
          id={`${uid}-method`}
          value={refund.method}
          onChange={(e) => setRefund({ ...refund, method: e.target.value })}
          className={field}
        >
          {REFUND_METHODS.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${uid}-ref`} className={labelCls}>
          Reference <span className="font-normal text-fg-muted">· optional</span>
        </label>
        <input
          id={`${uid}-ref`}
          value={refund.reference}
          onChange={(e) => setRefund({ ...refund, reference: e.target.value })}
          maxLength={120}
          placeholder="Transaction ID"
          className={field}
        />
      </div>
    </fieldset>
  );
}

/** Private note on a return. */
export function ReturnNote({ returnId, initial }) {
  const uid = useId();
  const [value, setValue] = useState(initial ?? "");
  const [pending, start] = useTransition();
  const [state, setState] = useState(null);
  return (
    <section className={box} aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`} className="mb-2 font-extrabold">
        Private note
      </h2>
      <label htmlFor={`${uid}-n`} className="sr-only">
        Private note (only staff see this)
      </label>
      <textarea
        id={`${uid}-n`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Only staff see this"
        className={`${field} py-2`}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setState(await saveReturnNote(returnId, value)))}
        className="btn-outline mt-2 min-h-10 w-full text-sm"
      >
        Save note
      </button>
      <div className="mt-2">
        <Result state={state} />
      </div>
    </section>
  );
}

/** "Record a refund" on an order page (outside returns). */
export function OrderRefund({ orderId, max, defaultMethod }) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [refund, setRefund] = useState({ amount: String(max || ""), method: defaultMethod, reference: "" });
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [state, setState] = useState(null);
  const errors = state?.ok === false ? (state.errors ?? {}) : {};
  if (!(max > 0)) return null;
  return (
    <section className={box} aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`} className="mb-2 font-extrabold">
        Refund
      </h2>
      {open ? (
        <div className="grid gap-3">
          <RefundFields
            uid={uid}
            refund={refund}
            setRefund={setRefund}
            errors={errors}
            max={max}
            title="Record a refund"
          />
          <div>
            <label htmlFor={`${uid}-why`} className={labelCls}>
              Reason
            </label>
            <input
              id={`${uid}-why`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={255}
              placeholder="e.g. Order cancelled after payment"
              className={field}
              aria-invalid={errors.reason ? true : undefined}
            />
            {errors.reason ? <p className="mt-1 text-[13px] font-semibold text-sale">{errors.reason}</p> : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => start(async () => setState(await recordOrderRefund(orderId, { ...refund, reason })))}
              className="btn-ink min-h-11 flex-1"
            >
              Record refund
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost min-h-11">
              Close
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-3 text-[13px] text-fg-muted">
            Refunded money outside a return? Record it so the order shows the right balance.
          </p>
          <button type="button" onClick={() => setOpen(true)} className="btn-outline min-h-11 w-full">
            Record a refund
          </button>
        </>
      )}
      <div className="mt-2">
        <Result state={state} />
      </div>
    </section>
  );
}
