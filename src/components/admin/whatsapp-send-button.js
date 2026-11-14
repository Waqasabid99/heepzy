"use client";

import { useTransition } from "react";
import { markMessageSent } from "@/actions/admin/messages";
import { waLink } from "@/lib/whatsapp";
import { WhatsApp } from "@/components/ui/icons";

/**
 * One tap: copies the message (backup, in case WhatsApp doesn't fill it in),
 * opens the customer's chat with the message typed in, and marks it sent.
 * The link opens in the click itself, so pop-up blockers allow it.
 */
export function WhatsAppSendButton({ message, onSent, quiet = false, className = "", children }) {
  const [, start] = useTransition();
  const href = waLink(message.phone, message.body);
  if (!href) {
    return <span className="text-sm font-semibold text-sale">Not a WhatsApp mobile number</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        navigator.clipboard?.writeText(message.body).catch(() => {});
        start(async () => {
          await markMessageSent(message.id);
          onSent?.();
        });
      }}
      className={`btn ${
        quiet
          ? "min-h-11 border border-line bg-transparent px-4 text-sm text-fg hover:bg-muted"
          : "min-h-12 bg-whatsapp-deep px-6 text-white hover:opacity-90"
      } ${className}`}
    >
      <WhatsApp className={quiet ? "size-4" : "size-5"} /> {children ?? "Send on WhatsApp"}
      <span className="sr-only">(opens WhatsApp)</span>
    </a>
  );
}
