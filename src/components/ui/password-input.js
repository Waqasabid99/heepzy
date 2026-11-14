"use client";

import { useState } from "react";
import { Eye, EyeOff } from "@/components/ui/icons";

/**
 * Password box with a show/hide button. Takes the same props as <input>;
 * `className` styles the input (room is made on the right for the button).
 */
export function PasswordInput({ className = "", id, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} id={id} type={show ? "text" : "password"} className={`${className} pr-12`} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label="Show password"
        aria-pressed={show}
        aria-controls={id}
        title={show ? "Hide password" : "Show password"}
        className="absolute top-1/2 right-1 inline-grid size-10 -translate-y-1/2 place-items-center rounded-full text-fg-muted hover:bg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-ring"
      >
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
