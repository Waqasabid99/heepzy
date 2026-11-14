"use client";

import { useState, useTransition } from "react";
import { retryPayment } from "@/actions/checkout";
import { CreditCard } from "@/components/ui/icons";

/** "Pay now" for an unpaid card order: starts a new Safepay attempt. */
export function RetryPayment({ orderNumber, token, label = "Pay now" }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await retryPayment(orderNumber, token);
            if (res && !res.ok) setError(res.message);
          })
        }
        className="btn min-h-12 bg-accent px-7 text-accent-fg hover:bg-accent-hover"
      >
        <CreditCard className="size-5" /> {pending ? "Taking you to Safepay…" : label}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-sale">
          {error}
        </p>
      ) : null}
    </div>
  );
}
