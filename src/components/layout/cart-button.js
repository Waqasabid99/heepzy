"use client";

import { openCartDrawer } from "@/lib/cart-events";

/**
 * The header bag icon. Opens the cart drawer; still a real link to /cart, so it
 * works without JavaScript and ctrl/cmd-click opens the cart page in a new tab.
 */
export function CartButton({ className, label, children }) {
  return (
    <a
      href="/cart"
      aria-label={label}
      aria-haspopup="dialog"
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        openCartDrawer();
      }}
    >
      {children}
    </a>
  );
}
