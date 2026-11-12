"use client";

import { useActionState } from "react";
import { subscribe } from "@/actions/newsletter";

export function NewsletterForm() {
  const [state, action, pending] = useActionState(subscribe, null);
  return (
    <form action={action} className="flex w-full max-w-md flex-col gap-2.5">
      <label htmlFor="nl-email" className="text-[13px] text-on-panel-muted">
        Early access to new drops, Eid collections and private sales.
      </label>
      <div className="flex gap-2 rounded-full bg-white p-1.5">
        <input
          id="nl-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email address"
          aria-describedby="nl-msg"
          className="min-w-0 flex-1 bg-transparent px-4 text-[15px] text-[#111] placeholder:text-[#5e5e59] focus-visible:outline-offset-4"
        />
        <button
          type="submit"
          disabled={pending}
          className="btn min-h-11 bg-accent px-6 text-accent-fg hover:bg-accent-hover"
        >
          {pending ? "Joining…" : "Subscribe"}
        </button>
      </div>
      <p id="nl-msg" role="status" className="min-h-5 text-[13px] font-semibold">
        {state?.message}
      </p>
    </form>
  );
}
