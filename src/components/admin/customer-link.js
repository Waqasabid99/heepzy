"use client";

import { useState, useTransition } from "react";
import { customerOrderLink } from "@/actions/admin/order-create";
import { Check, ExternalLink, WhatsApp } from "@/components/ui/icons";

/**
 * Private link to the customer's order page (where an unpaid card order can be
 * paid). Each click makes a new link; older links stop working.
 */
export function CustomerLink({ orderId, orderNumber, phone, needsPayment }) {
  const [pending, start] = useTransition();
  const [link, setLink] = useState(null);
  const [note, setNote] = useState(null);

  const message = link
    ? needsPayment
      ? `Assalam o Alaikum! Your Mr. Shoes order ${orderNumber} is ready. Please pay securely here: ${link}`
      : `Assalam o Alaikum! Track your Mr. Shoes order ${orderNumber} here: ${link}`
    : "";
  const wa = phone
    ? `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "92")}?text=${encodeURIComponent(message)}`
    : null;

  return (
    <section
      className={`rounded-2xl border p-5 ${needsPayment ? "border-info bg-info-bg" : "border-line bg-surface"}`}
      aria-labelledby="cl-title"
    >
      <h2 id="cl-title" className="mb-1 font-extrabold">
        Customer link
      </h2>
      <p className="mb-3 text-[13px] text-fg-muted">
        {needsPayment
          ? "Send this so the customer can pay by card or wallet. The order confirms itself once paid."
          : "A private link where the customer can see this order without signing in."}
      </p>
      {link ? (
        <div className="grid gap-2">
          <input
            readOnly
            value={link}
            aria-label="Customer order link"
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-11 w-full rounded-xl border border-field bg-surface px-3 font-mono text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setNote("Link copied.");
                } catch {
                  setNote("Select the link and copy it.");
                }
              }}
              className="btn-outline min-h-10 flex-1 text-sm"
            >
              Copy
            </button>
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-10 flex-1 text-sm">
                <WhatsApp className="size-4" /> WhatsApp
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : null}
            <a href={link} target="_blank" rel="noopener noreferrer" className="btn-ghost min-h-10 text-sm">
              Open <ExternalLink className="size-4" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await customerOrderLink(orderId);
              if (res.ok) setLink(res.url);
              else setNote(res.message);
            })
          }
          className={`${needsPayment ? "btn-ink" : "btn-outline"} min-h-11 w-full`}
        >
          {pending ? "Creating link…" : needsPayment ? "Get payment link" : "Get order link"}
        </button>
      )}
      {note ? (
        <p role="status" className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-success">
          <Check className="size-4" /> {note}
        </p>
      ) : null}
      {!link ? <p className="mt-2 text-[12px] text-fg-muted">A new link replaces any link sent before.</p> : null}
    </section>
  );
}
