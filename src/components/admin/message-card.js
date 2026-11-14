"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { reopenMessage, skipMessage } from "@/actions/admin/messages";
import { WhatsAppSendButton } from "@/components/admin/whatsapp-send-button";
import { MESSAGE_EVENTS } from "@/lib/message-templates";
import { formatPhone } from "@/lib/phone";

const STATUS = {
  PENDING: ["To send", "bg-warning-bg text-warning"],
  SENT: ["Sent", "bg-success-bg text-success"],
  SKIPPED: ["Dismissed", "bg-muted text-fg-muted"],
};

const when = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Karachi",
});

/**
 * One WhatsApp message. "Send on WhatsApp" copies the text, opens the chat
 * with it typed in (phone: WhatsApp app; computer: WhatsApp Web/Desktop) and
 * marks it sent. Staff press send in WhatsApp.
 */
export function MessageCard({ message: m, showOrder = true }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState(null);
  const [label, cls] = STATUS[m.status] ?? STATUS.PENDING;
  const run = (fn) =>
    start(async () => {
      const res = await fn(m.id);
      setError(res?.ok ? null : (res?.message ?? "Something went wrong."));
    });

  return (
    <article className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-bold">{MESSAGE_EVENTS[m.event]?.label ?? m.event}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}>{label}</span>
        <span className="text-xs text-fg-muted">
          {m.status === "PENDING" || !m.handledAt
            ? `Ready ${when.format(new Date(m.createdAt))}`
            : `${label} ${when.format(new Date(m.handledAt))}`}
        </span>
      </header>
      {showOrder ? (
        <p className="mt-1 text-sm">
          <Link href={`/admin/orders/${m.order.id}`} className="font-semibold hover:underline">
            {m.order.orderNumber}
          </Link>{" "}
          · {m.order.shipFullName}, {m.order.shipCity}
        </p>
      ) : null}
      <p className="mt-0.5 text-sm text-fg-muted">To {formatPhone(m.phone)}</p>

      <details className="group mt-3 rounded-xl bg-muted" open={m.status === "PENDING"}>
        <summary className="flex min-h-10 cursor-pointer list-none items-center px-3 text-[13px] font-semibold [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Show message</span>
          <span className="hidden group-open:inline">Message</span>
        </summary>
        <p className="px-3 pb-3 text-sm [overflow-wrap:anywhere] whitespace-pre-line">{m.body}</p>
      </details>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {m.status === "SENT" ? (
          <WhatsAppSendButton message={m} quiet>
            Send again
          </WhatsAppSendButton>
        ) : (
          <WhatsAppSendButton message={m} />
        )}
        {m.status === "PENDING" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(skipMessage)}
            className="btn-ghost min-h-11 text-sm"
          >
            Dismiss
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(reopenMessage)}
            className="btn-ghost min-h-11 text-sm"
          >
            Back to “To send”
          </button>
        )}
        {error ? (
          <span role="alert" className="text-[13px] font-semibold text-sale">
            {error}
          </span>
        ) : null}
      </div>
    </article>
  );
}
