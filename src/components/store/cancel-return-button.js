"use client";

import { useState, useTransition } from "react";
import { cancelReturnRequest } from "@/actions/returns";

/** Withdraw a return request that hasn't been reviewed yet. */
export function CancelReturnButton({ orderNumber, token, returnId }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState(null);
  if (msg?.ok) return <span className="text-[13px] font-semibold text-success">{msg.message}</span>;
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setMsg(await cancelReturnRequest(orderNumber, token, returnId)))}
        className="min-h-10 text-[13px] font-bold underline underline-offset-4"
      >
        {pending ? "Cancelling…" : "Cancel request"}
      </button>
      {msg && !msg.ok ? <span className="text-[13px] text-sale">{msg.message}</span> : null}
    </span>
  );
}
