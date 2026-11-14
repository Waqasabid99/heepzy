"use client";

import { useState, useTransition } from "react";
import { reopenMessage } from "@/actions/admin/messages";
import { WhatsAppSendButton } from "@/components/admin/whatsapp-send-button";
import { MESSAGE_EVENTS } from "@/lib/message-templates";

const when = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Karachi",
});

/** Compact list of WhatsApp messages already sent or skipped for an order. */
export function MessageHistory({ messages }) {
  const [open, setOpen] = useState(null);
  const [pending, start] = useTransition();
  return (
    <ul className="divide-y divide-line">
      {messages.map((m) => (
        <li key={m.id} className="py-2.5 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold">{MESSAGE_EVENTS[m.event]?.label ?? m.event}</span>
            <span className="text-fg-muted">
              {m.status === "SENT" ? "Sent" : "Dismissed"}
              {m.handledAt ? ` ${when.format(new Date(m.handledAt))}` : ""}
            </span>
            <span className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOpen(open === m.id ? null : m.id)}
                aria-expanded={open === m.id}
                className="btn-ghost min-h-9 px-3 text-[13px]"
              >
                {open === m.id ? "Hide" : "View"}
              </button>
              <WhatsAppSendButton message={m} quiet className="min-h-9 px-3 text-[13px]">
                {m.status === "SENT" ? "Send again" : "Send"}
              </WhatsAppSendButton>
              {m.status === "SKIPPED" ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => start(() => reopenMessage(m.id))}
                  className="btn-ghost min-h-9 px-3 text-[13px]"
                >
                  To send
                </button>
              ) : null}
            </span>
          </div>
          {open === m.id ? (
            <p className="mt-2 rounded-xl bg-muted p-3 text-[13px] [overflow-wrap:anywhere] whitespace-pre-line">
              {m.body}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
