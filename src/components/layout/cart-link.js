import Link from "next/link";
import { getCartCount } from "@/lib/cart";

const bag = (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
  >
    <path d="M5 8h14l-1 12H6L5 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

const cls =
  "relative inline-grid size-11 place-items-center rounded-full bg-accent text-accent-fg transition-colors hover:bg-accent-hover";

/** Reads the cart cookie → must render inside <Suspense>. */
export async function CartLink() {
  const count = await getCartCount();
  return (
    <Link href="/cart" aria-label={`Cart, ${count} ${count === 1 ? "item" : "items"}`} className={cls}>
      {bag}
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-fg px-1 text-[11px] font-bold text-bg"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

export function CartLinkFallback() {
  return (
    <Link href="/cart" aria-label="Cart" className={cls}>
      {bag}
    </Link>
  );
}
