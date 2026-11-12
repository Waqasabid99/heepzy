import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { getCart } from "@/lib/cart";
import { getStoreSettings } from "@/lib/settings";
import { formatPKR } from "@/lib/money";
import { updateCartItem } from "@/actions/cart";

export const metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-page pt-10 pb-28">
      <h1 className="mb-10 display text-[clamp(48px,6vw,88px)]">Your cart</h1>
      <Suspense fallback={<div className="h-64 rounded-card bg-muted" aria-busy="true" />}>
        <CartContents />
      </Suspense>
    </div>
  );
}

async function CartContents() {
  const [cart, settings] = await Promise.all([getCart(), getStoreSettings()]);

  if (!cart.lines.length) {
    return (
      <div className="rounded-panel bg-muted px-6 py-20 text-center">
        <p className="heading text-4xl">Your cart is empty.</p>
        <p className="mt-3 text-fg-muted">Find a pair you&apos;ll live in.</p>
        <Link href="/products" className="btn-primary mt-8">
          Shop all shoes
        </Link>
      </div>
    );
  }

  const threshold =
    settings.freeDeliveryEnabled && settings.freeDeliveryThreshold ? Number(settings.freeDeliveryThreshold) : null;
  const remaining = threshold ? Math.max(0, threshold - cart.subtotal) : null;
  const pct = threshold ? Math.min(100, Math.round((cart.subtotal / threshold) * 100)) : 0;

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1fr_400px]">
      <section aria-label="Cart items">
        <ul className="divide-y divide-line border-y border-line">
          {cart.lines.map((l) => (
            <li key={l.id} className="flex gap-5 py-6">
              <Link
                href={`/products/${l.slug}`}
                className="relative size-28 shrink-0 overflow-hidden bg-muted sm:size-32"
              >
                {l.image ? (
                  <Image src={l.image.url} alt={l.image.alt} fill sizes="128px" className="object-cover" />
                ) : null}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">
                      <Link href={`/products/${l.slug}`} className="hover:underline">
                        {l.name}
                      </Link>
                    </h2>
                    <p className="text-[13px] text-fg-muted">
                      {l.color} · EU {l.size}
                    </p>
                  </div>
                  <p className="font-display text-xl font-medium">{formatPKR(l.lineTotal)}</p>
                </div>
                {!l.available ? (
                  <p className="text-[13px] font-semibold text-sale">No longer available — please remove it.</p>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center gap-4 pt-3">
                  <div
                    role="group"
                    aria-label={`Quantity for ${l.name}`}
                    className="flex items-center rounded-full border border-line"
                  >
                    <form action={updateCartItem}>
                      <input type="hidden" name="itemId" value={l.id} />
                      <input type="hidden" name="quantity" value={l.quantity - 1} />
                      <button type="submit" aria-label="Decrease quantity" className="h-11 w-11 text-lg">
                        −
                      </button>
                    </form>
                    <span className="min-w-6 text-center font-bold">{l.quantity}</span>
                    <form action={updateCartItem}>
                      <input type="hidden" name="itemId" value={l.id} />
                      <input type="hidden" name="quantity" value={l.quantity + 1} />
                      <button
                        type="submit"
                        aria-label="Increase quantity"
                        disabled={l.quantity >= l.maxQty}
                        className="h-11 w-11 text-lg disabled:opacity-40"
                      >
                        +
                      </button>
                    </form>
                  </div>
                  <form action={updateCartItem}>
                    <input type="hidden" name="itemId" value={l.id} />
                    <input type="hidden" name="quantity" value="0" />
                    <button type="submit" className="min-h-11 text-[13px] font-semibold text-fg-muted link-underline">
                      Remove<span className="sr-only"> {l.name}</span>
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/products" className="mt-6 inline-block text-sm font-bold link-underline">
          ← Continue shopping
        </Link>
      </section>

      <aside aria-labelledby="summary-title" className="flex flex-col gap-6 card p-7 lg:sticky lg:top-28">
        <h2 id="summary-title" className="heading text-3xl">
          Order summary
        </h2>

        {threshold ? (
          <div>
            <p className="text-sm font-semibold">
              {remaining > 0 ? (
                <>You&apos;re {formatPKR(remaining)} away from free delivery</>
              ) : (
                "You've unlocked free delivery"
              )}
            </p>
            <div
              className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Progress to free delivery"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : null}

        <dl className="grid gap-2.5 border-t border-line pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-fg-muted">
              Subtotal ({cart.count} {cart.count === 1 ? "item" : "items"})
            </dt>
            <dd>{formatPKR(cart.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-fg-muted">Delivery</dt>
            <dd>{remaining === 0 ? "Free" : "Calculated at checkout"}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-4">
            <dt className="font-extrabold">Total</dt>
            <dd className="font-display text-3xl font-medium">{formatPKR(cart.subtotal)}</dd>
          </div>
          <p className="text-xs text-fg-muted">
            {settings.pricesIncludeTax ? "Prices include GST." : "GST added at checkout."} Have a voucher? Apply it at
            checkout.
          </p>
        </dl>

        <Link href="/checkout" className="btn-primary min-h-14 text-[15px] font-extrabold">
          Proceed to checkout
        </Link>
        <p className="text-center text-xs text-fg-muted">
          {settings.codEnabled ? "Cash on delivery available · " : ""}Secure card payments
        </p>
      </aside>
    </div>
  );
}
