"use client";

import { useEffect, useRef } from "react";
import { WhatsAppSendButton } from "@/components/admin/whatsapp-send-button";
import { MESSAGE_EVENTS } from "@/lib/message-templates";
import { formatPhone } from "@/lib/phone";
import { Check, Close } from "@/components/ui/icons";

/**
 * Shown right after an action that made a customer message (order status,
 * return step, refund): the text, and one button that opens WhatsApp with it
 * typed in. Pass the action's result ({ message, whatsapp, at }).
 */
export function SendMessageDialog({ result }) {
  const ref = useRef(null);
  const msg = result?.whatsapp;
  useEffect(() => {
    if (msg && !ref.current?.open) ref.current?.showModal();
  }, [msg, result?.at]);
  if (!msg) return null;
  const close = () => ref.current?.close();
  return (
    <dialog
      ref={ref}
      aria-labelledby="sm-title"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-fg/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-success">
              <Check className="size-4" /> {result.message}
            </p>
            <h2 id="sm-title" className="mt-1 text-lg font-extrabold">
              Let the customer know
            </h2>
            <p className="text-sm text-fg-muted">
              {MESSAGE_EVENTS[msg.event]?.label} · to {formatPhone(msg.phone)}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="inline-grid size-10 shrink-0 place-items-center rounded-full hover:bg-muted"
          >
            <Close className="size-5" />
          </button>
        </div>
        <p className="mt-4 max-h-[45dvh] overflow-y-auto rounded-xl bg-muted p-3 text-sm [overflow-wrap:anywhere] whitespace-pre-line">
          {msg.body}
        </p>
        <div className="mt-4 grid gap-2 sm:flex sm:items-center">
          <WhatsAppSendButton message={msg} onSent={close} className="w-full sm:w-auto" />
          <button type="button" onClick={close} className="btn-ghost min-h-12 text-sm">
            Later
          </button>
        </div>
        <p className="mt-3 text-xs text-fg-muted">
          WhatsApp opens with the message ready; press send there. “Later” keeps it in Messages.
        </p>
      </div>
    </dialog>
  );
}
