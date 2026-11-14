"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { recheckPayment, saveAdminNote, updateOrderStatus } from "@/actions/admin/orders";
import { AlertCircle, Check } from "@/components/ui/icons";
import { SendMessageDialog } from "@/components/admin/send-message-dialog";

const NEXT_LABEL = {
  CONFIRMED: "Confirm order",
  PROCESSING: "Start packing",
  SHIPPED: "Mark as shipped",
  DELIVERED: "Mark as delivered",
};
const COURIERS = ["TCS", "Leopards", "M&P", "Trax", "PostEx", "Call Courier", "BlueEx", "Rider (own)"];

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

/** Status workflow, payment check and admin note for one order. */
export function OrderActions({ order, next, children }) {
  const [state, action, pending] = useActionState(updateOrderStatus, null);
  const [noteState, noteAction, notePending] = useActionState(saveAdminNote, null);
  const [mode, setMode] = useState(null); // "SHIPPED" | "CANCELLED" | null
  const [checking, startCheck] = useTransition();
  const [checkState, setCheckState] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
    setMode(null);
  };
  const forward = next.filter((s) => s !== "CANCELLED");
  const canCancel = next.includes("CANCELLED");
  const awaitingCard = order.paymentMethod === "CARD" && order.paymentStatus !== "PAID";
  const field = "min-h-11 w-full rounded-xl border border-field bg-surface px-3 text-sm";

  return (
    <div className="grid gap-4">
      <SendMessageDialog result={state?.ok ? state : null} />
      <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="oa-title">
        <h2 id="oa-title" className="mb-3 font-extrabold">
          Next step
        </h2>
        <div className="grid gap-2">
          {forward.map((s) =>
            s === "SHIPPED" ? (
              <button key={s} type="button" onClick={() => setMode("SHIPPED")} className="btn-ink min-h-11 w-full">
                {NEXT_LABEL[s]}
              </button>
            ) : (
              <form key={s} onSubmit={submit}>
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="status" value={s} />
                <button
                  type="submit"
                  disabled={pending || (s === "CONFIRMED" && awaitingCard)}
                  className="btn-ink min-h-11 w-full"
                >
                  {NEXT_LABEL[s]}
                </button>
              </form>
            ),
          )}
          {!forward.length ? <p className="text-sm text-fg-muted">No further steps for this order.</p> : null}
          {awaitingCard && next.includes("CONFIRMED") ? (
            <p className="text-[13px] text-fg-muted">Card orders can be confirmed once Safepay reports the payment.</p>
          ) : null}
        </div>

        {mode === "SHIPPED" ? (
          <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl bg-muted p-3">
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="status" value="SHIPPED" />
            <div>
              <label htmlFor="oa-courier" className="mb-1 block text-[13px] font-bold">
                Courier
              </label>
              <input id="oa-courier" name="courier" list="oa-couriers" required className={field} />
              <datalist id="oa-couriers">
                {COURIERS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="oa-track" className="mb-1 block text-[13px] font-bold">
                Tracking number <span className="font-normal text-fg-muted">(optional)</span>
              </label>
              <input id="oa-track" name="trackingNumber" maxLength={80} className={field} />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={pending} className="btn-ink min-h-11 flex-1">
                Save as shipped
              </button>
              <button type="button" onClick={() => setMode(null)} className="btn-ghost min-h-11">
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {canCancel ? (
          mode === "CANCELLED" ? (
            <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl bg-danger-bg p-3">
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="status" value="CANCELLED" />
              <p className="text-[13px] font-semibold text-sale">
                Cancelling puts all items back in stock.
                {order.paymentStatus === "PAID"
                  ? " This order is paid: refund the customer, then record the refund on this page."
                  : ""}
              </p>
              <div>
                <label htmlFor="oa-reason" className="mb-1 block text-[13px] font-bold">
                  Reason <span className="font-normal">(optional)</span>
                </label>
                <input
                  id="oa-reason"
                  name="note"
                  maxLength={500}
                  className={field}
                  placeholder="e.g. Customer asked to cancel"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="btn min-h-11 flex-1 bg-sale text-white hover:opacity-90"
                >
                  Yes, cancel order
                </button>
                <button type="button" onClick={() => setMode(null)} className="btn-ghost min-h-11">
                  Keep order
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setMode("CANCELLED")}
              className="btn-ghost mt-2 min-h-10 w-full text-sm text-sale"
            >
              Cancel order
            </button>
          )
        ) : null}
        <div className="mt-3">
          <Result state={state} />
        </div>
      </section>
      {/* Waiting WhatsApp messages sit right under the next step. */}
      {children}

      {order.paymentMethod === "CARD" ? (
        <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="oa-pay">
          <h2 id="oa-pay" className="mb-2 font-extrabold">
            Card payment
          </h2>
          <p className="mb-3 text-[13px] text-fg-muted">
            Payments are confirmed automatically. If something looks wrong, ask Safepay for the latest status.
          </p>
          <button
            type="button"
            disabled={checking}
            onClick={() => startCheck(async () => setCheckState(await recheckPayment(order.id)))}
            className="btn-outline min-h-11 w-full"
          >
            {checking ? "Checking…" : "Check payment with Safepay"}
          </button>
          <div className="mt-3">
            <Result state={checkState} />
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-line bg-surface p-5" aria-labelledby="oa-note">
        <h2 id="oa-note" className="mb-2 font-extrabold">
          Private note
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => noteAction(fd));
          }}
          className="grid gap-2"
        >
          <input type="hidden" name="orderId" value={order.id} />
          <label htmlFor="oa-admin-note" className="sr-only">
            Private note (only admins see this)
          </label>
          <textarea
            id="oa-admin-note"
            name="adminNote"
            defaultValue={order.adminNote ?? ""}
            rows={3}
            maxLength={2000}
            placeholder="Only admins see this"
            className={`${field} py-2`}
          />
          <button type="submit" disabled={notePending} className="btn-outline min-h-10 text-sm">
            Save note
          </button>
          <Result state={noteState} />
        </form>
      </section>
    </div>
  );
}
