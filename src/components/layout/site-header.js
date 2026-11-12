import { Suspense } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CartLink, CartLinkFallback } from "./cart-link";
import { NavLink } from "./nav-link";

export const NAV = [
  { href: "/", label: "Home", match: "/" },
  { href: "/products?gender=men", label: "Men" },
  { href: "/products?gender=women", label: "Women" },
  { href: "/products?category=sneakers", label: "Sneakers" },
  { href: "/offers", label: "Offers", match: "/offers", dot: true },
];

const STYLES = {
  overlay: {
    header: "absolute inset-x-0 top-10 z-30 px-3 sm:px-5",
    bar: "mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 px-5 py-6 text-on-panel sm:px-10",
    list: "border border-panel-line",
    link: "hover:bg-on-panel/10 aria-[current=page]:bg-on-panel aria-[current=page]:text-black",
    icon: "inline-grid size-11 place-items-center rounded-full border border-panel-line text-on-panel transition-colors hover:bg-on-panel/10",
    toggle: "border border-panel-line text-on-panel hover:bg-on-panel/10",
  },
  bar: {
    header: "sticky top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-4",
    bar: "mx-auto flex max-w-content flex-wrap items-center justify-between gap-4 rounded-full border border-line bg-surface/90 py-2.5 pr-2.5 pl-6 backdrop-blur",
    list: "",
    link: "hover:bg-muted aria-[current=page]:bg-fg aria-[current=page]:text-bg",
    icon: "btn-icon",
    toggle: "border border-line",
  },
};

/**
 * Two looks from the design, chosen by the route group's layout:
 *  - "overlay": light-on-dark, sits inside the home hero panel
 *  - "bar": the floating pill used on every other page
 */
export function SiteHeader({ variant = "bar" }) {
  const s = STYLES[variant];
  const linkCls = `inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 transition-colors ${s.link}`;

  return (
    <header className={s.header}>
      <div className={s.bar}>
        <Link href="/" className="font-display text-[26px] leading-none font-medium tracking-wide">
          Heepzy
        </Link>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className={`flex items-center gap-1 rounded-full p-1.5 text-[13px] font-semibold ${s.list}`}>
            {NAV.map((item) => {
              const label = (
                <>
                  {item.label}
                  {item.dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" /> : null}
                </>
              );
              return (
                <li key={item.href}>
                  <Suspense
                    fallback={
                      <Link href={item.href} className={linkCls}>
                        {label}
                      </Link>
                    }
                  >
                    <NavLink href={item.href} match={item.match} className={linkCls}>
                      {label}
                    </NavLink>
                  </Suspense>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/products" aria-label="Search shoes" className={s.icon}>
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </Link>
          <ThemeToggle className={s.toggle} />
          <Link href="/account" aria-label="Your account" className={s.icon}>
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </svg>
          </Link>
          <Suspense fallback={<CartLinkFallback />}>
            <CartLink />
          </Suspense>
        </div>

        {/* Mobile navigation — native disclosure, works without JS */}
        <details className="w-full md:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold">
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 7h16M4 12h16M4 17h10" />
            </svg>
            Menu
          </summary>
          <nav aria-label="Mobile">
            <ul className="grid gap-1 pb-2">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-xl px-3 py-2.5 font-semibold hover:bg-accent hover:text-accent-fg"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}
