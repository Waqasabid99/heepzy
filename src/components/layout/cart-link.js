import { getCartCount } from "@/lib/cart";
import { Bag } from "@/components/ui/icons";
import { CartButton } from "./cart-button";

const cls = "relative inline-grid size-11 place-items-center rounded-full text-fg transition-colors hover:bg-muted";

/** Reads the cart cookie → must render inside <Suspense>. */
export async function CartLink() {
  const count = await getCartCount();
  return (
    <CartButton label={`Bag, ${count} ${count === 1 ? "item" : "items"}`} className={cls}>
      <Bag />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute top-0.5 right-0 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-fg"
        >
          {count}
        </span>
      ) : null}
    </CartButton>
  );
}

export function CartLinkFallback() {
  return (
    <CartButton label="Bag" className={cls}>
      <Bag />
    </CartButton>
  );
}
