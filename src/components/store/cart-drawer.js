"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { changeCartLine, getCartDrawer } from "@/actions/cart";
import { CART_OPEN_EVENT } from "@/lib/cart-events";
import { formatPKR } from "@/lib/money";
import { ArrowRight, Check, Close } from "@/components/ui/icons";

/**
 * Slide-in bag. Opens from the header bag icon or after "Add to bag".
 * Native <dialog>: focus is trapped, Esc and a backdrop click close it.
 */
export function CartDrawer() {
  const ref = useRef(null);
  const [data, setData] = useState(null);
  const [added, setAdded] = useState(null); // variantId just added, for the confirmation strip
  const [loading, startLoading] = useTransition();
  const [busyLine, setBusyLine] = useState(null);
  const [, startChange] = useTransition();

  const load = useCallback(() => {
    startLoading(async () => setData(await getCartDrawer()));
  }, []);

  useEffect(() => {
    const onOpen = (e) => {
      setAdded(e.detail?.variantId ?? null);
      if (!ref.current?.open) ref.current?.showModal();
      load();
    };
    window.addEventListener(CART_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CART_OPEN_EVENT, onOpen);
  }, [load]);

  const close = () => ref.current?.close();

  const change = (line, quantity) => {
    setBusyLine(line.id);
    startChange(async () => {
      setData(await changeCartLine(line.id, quantity));
      setBusyLine(null);
      if (quantity === 0 && line.variantId === added) setAdded(null);
    });
  };

  const justAdded = added ? data?.lines.find((l) => l.variantId === added) : null;
  const remaining = data?.threshold ? Math.max(0, data.threshold - data.subtotal) : null;
  const pct = data?.threshold ? Math.min(100, Math.round((data.subtotal / data.threshold) * 100)) : 0;

  return (
    <dialog
      ref={ref}
      aria-labelledby="cart-drawer-title"
      className="drawer bg-surface text-fg"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <h2 id="cart-drawer-title" className="heading text-2xl">
            Your bag{data?.count ? <span className="text-fg-muted"> ({data.count})</span> : null}
          </h2>
          <button type="button" onClick={close} aria-label="Close bag" className="btn-icon border-0">
            <Close className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {!data ? (
            <DrawerSkeleton />
          ) : !data.lines.length ? (
            <div className="px-6 py-16 text-center">
              <p className="heading text-3xl">Your bag is empty.</p>
              <p className="mt-2 text-fg-muted">Find a pair you&apos;ll live in.</p>
              <Link href="/products" onClick={close} className="btn-primary mt-7">
                Shop all shoes
              </Link>
            </div>
          ) : (
            <>
              {justAdded ? (
                <p
                  role="status"
                  className="flex items-center gap-2 border-b border-line bg-success-bg px-5 py-3 text-sm font-semibold sm:px-6"
                >
                  <Check className="size-4 shrink-0" /> Added to your bag
                </p>
              ) : null}

              {data.threshold ? (
                <div className="border-b border-line px-5 py-4 sm:px-6">
                  <p className="text-sm font-semibold">
                    {remaining > 0 ? (
                      <>You&apos;re {formatPKR(remaining)} away from free delivery</>
                    ) : (
                      "You've unlocked free delivery"
                    )}
                  </p>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label="Progress to free delivery"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ) : null}

              <ul aria-label="Items in your bag" className="divide-y divide-line">
                {data.lines.map((l) => (
                  <li
                    key={l.id}
                    aria-busy={busyLine === l.id}
                    className={`flex gap-4 px-5 py-4 transition-opacity sm:px-6 ${
                      busyLine === l.id ? "opacity-50" : ""
                    } ${l.variantId === added ? "bg-muted/50" : ""}`}
                  >
                    <Link
                      href={`/products/${l.slug}`}
                      onClick={close}
                      className="relative size-22 shrink-0 overflow-hidden rounded-lg bg-muted"
                    >
                      {l.image ? (
                        <Image src={l.image.url} alt={l.image.alt} fill sizes="88px" className="object-cover" />
                      ) : null}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/products/${l.slug}`}
                            onClick={close}
                            className="line-clamp-2 text-sm font-bold hover:underline"
                          >
                            {l.name}
                          </Link>
                          <p className="mt-0.5 text-[13px] text-fg-muted">
                            {l.color} · EU {l.size}
                          </p>
                          {l.offer ? <p className="text-[12px] font-semibold text-brand">{l.offer}</p> : null}
                        </div>
                        <p className="shrink-0 text-right font-display text-lg font-medium">
                          {l.compareAt ? (
                            <span className="block text-xs text-fg-muted line-through">
                              <span className="sr-only">Was </span>
                              {formatPKR(l.compareAt * l.quantity)}
                            </span>
                          ) : null}
                          {formatPKR(l.lineTotal)}
                        </p>
                      </div>
                      {!l.available ? (
                        <p className="mt-1 text-[13px] font-semibold text-sale">No longer available — please remove it.</p>
                      ) : null}
                      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                        <div
                          role="group"
                          aria-label={`Quantity for ${l.name}`}
                          className="flex items-center rounded-full border border-line"
                        >
                          <button
                            type="button"
                            onClick={() => change(l, l.quantity - 1)}
                            disabled={busyLine === l.id}
                            aria-label="Decrease quantity"
                            className="h-11 w-10 text-lg disabled:opacity-40"
                          >
                            −
                          </button>
                          <span className="min-w-5 text-center text-sm font-bold" aria-live="polite">
                            {l.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => change(l, l.quantity + 1)}
                            disabled={busyLine === l.id || l.quantity >= l.maxQty}
                            aria-label="Increase quantity"
                            className="h-11 w-10 text-lg disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => change(l, 0)}
                          disabled={busyLine === l.id}
                          className="min-h-11 text-[13px] font-semibold text-fg-muted link-underline"
                        >
                          Remove<span className="sr-only"> {l.name}</span>
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {data.suggestions.length ? (
                <section aria-labelledby="pair-title" className="border-t border-line px-5 py-5 sm:px-6">
                  <h3 id="pair-title" className="text-sm font-extrabold tracking-[0.08em] uppercase">
                    You may also like
                  </h3>
                  <ul className="mt-3 grid gap-3">
                    {data.suggestions.map((p) => (
                      <li key={p.slug}>
                        <Link
                          href={`/products/${p.slug}`}
                          onClick={close}
                          className="group flex items-center gap-4 rounded-xl border border-line p-2.5 pr-4 hover:border-fg"
                        >
                          <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {p.image ? (
                              <Image src={p.image.url} alt="" fill sizes="64px" className="object-cover" />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{p.name}</span>
                            <span className="block text-xs text-fg-muted">{p.subtitle}</span>
                            <span className="mt-0.5 block text-sm font-semibold">
                              {p.compareAt ? (
                                <span className="mr-1.5 text-xs font-normal text-fg-muted line-through">
                                  {formatPKR(p.compareAt)}
                                </span>
                              ) : null}
                              {formatPKR(p.price)}
                            </span>
                          </span>
                          <span className="hidden text-[12px] font-bold tracking-[0.06em] uppercase group-hover:underline sm:inline">
                            Choose size
                          </span>
                          <ArrowRight className="size-4 shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </div>

        {data?.lines.length ? (
          <footer className="border-t border-line px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-bold">Subtotal</span>
              <span className="font-display text-2xl font-medium" aria-live="polite">
                {formatPKR(data.subtotal)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-fg-muted">Delivery and any vouchers are worked out at checkout.</p>
            <div className="mt-4 grid gap-2.5">
              <Link href="/checkout" onClick={close} className="btn-primary w-full">
                Checkout
              </Link>
              <Link href="/cart" onClick={close} className="btn-outline w-full">
                View bag ({data.count})
              </Link>
              <button
                type="button"
                onClick={close}
                className="min-h-11 text-sm font-bold underline underline-offset-4"
              >
                Continue shopping
              </button>
            </div>
          </footer>
        ) : null}
        {loading && data ? <span className="sr-only" role="status">Updating your bag</span> : null}
      </div>
    </dialog>
  );
}

function DrawerSkeleton() {
  return (
    <div role="status" aria-busy="true" className="divide-y divide-line">
      <span className="sr-only">Loading your bag</span>
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="flex gap-4 px-5 py-4 sm:px-6">
          <div className="size-22 shrink-0 animate-pulse rounded-lg bg-muted" />
          <div className="flex-1">
            <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-muted" />
            <div className="mt-5 h-9 w-28 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
