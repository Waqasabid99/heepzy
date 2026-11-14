"use client";

import { useRef } from "react";
import { Menu } from "@/components/ui/icons";

/**
 * Phone-size admin menu: a disclosure that drops the nav down over the page
 * and closes again when a link is chosen.
 */
export function AdminMobileMenu({ children }) {
  const ref = useRef(null);
  return (
    <details ref={ref} className="group md:hidden">
      <summary
        aria-label="Admin menu"
        className="inline-grid size-11 cursor-pointer list-none place-items-center rounded-full hover:bg-muted [&::-webkit-details-marker]:hidden"
      >
        <Menu />
      </summary>
      <div
        className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-panel p-3 text-on-panel shadow-xl"
        onClick={(e) => {
          if (e.target.closest("a") && ref.current) ref.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}
