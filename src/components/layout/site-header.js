import { Suspense } from "react";
import Link from "next/link";
import Form from "next/form";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Menu, Search, User } from "@/components/ui/icons";
import { CartLink, CartLinkFallback } from "./cart-link";
import { CartDrawer } from "@/components/store/cart-drawer";
import { NavLink } from "./nav-link";
import { AccountMenu } from "./account-menu";
import { getCurrentUser } from "@/lib/session";
import { isStaff } from "@/lib/roles";

export const NAV = [
  { href: "/products?sort=newest", label: "New in" },
  { href: "/products?gender=women", label: "Women" },
  { href: "/products?gender=men", label: "Men" },
  { href: "/products?category=sneakers", label: "Sneakers" },
  { href: "/products?category=khussa", label: "Khussa" },
  { href: "/products?category=formal", label: "Formal" },
  { href: "/offers", label: "Sale", match: "/offers", sale: true },
];

const iconBtn = "inline-grid size-11 shrink-0 place-items-center rounded-full text-fg transition-colors hover:bg-muted";

function SearchForm({ id, className = "" }) {
  return (
    <Form action="/products" role="search" className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        Search shoes
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-muted" />
      <input
        id={id}
        name="q"
        type="search"
        placeholder="Search khussa, sneakers, heels…"
        autoComplete="off"
        className="h-11 w-full rounded-full border border-line bg-surface pr-4 pl-10 text-sm text-fg placeholder:text-fg-muted focus-visible:border-fg focus-visible:outline-offset-1"
      />
    </Form>
  );
}

function SignInLink() {
  return (
    <Link href="/account" aria-label="Sign in or create an account" className={iconBtn}>
      <User />
    </Link>
  );
}

/** Signed in: initial + menu (with the admin dashboard for staff). Signed out: the sign-in icon. */
async function AccountControl() {
  const user = await getCurrentUser();
  if (!user) return <SignInLink />;
  return <AccountMenu name={user.name} staff={isStaff(user.role)} />;
}

/** Flat white store header (Option E1): logo, uppercase nav, search, account, theme, bag. */
export function SiteHeader() {
  const linkCls =
    "inline-flex min-h-11 items-center whitespace-nowrap border-b-2 border-transparent text-[13px] font-extrabold tracking-[0.08em] uppercase transition-colors hover:border-fg aria-[current=page]:border-accent";

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur supports-backdrop-filter:bg-surface/85">
      <div className="container-page flex h-20 items-center gap-3 lg:h-24 lg:gap-8">
        {/* Mobile menu — native disclosure, works without JS */}
        <details className="group lg:hidden">
          <summary aria-label="Menu" className={`${iconBtn} -ml-2.5 cursor-pointer list-none`}>
            <Menu />
          </summary>
          <div className="absolute inset-x-0 top-full border-b border-line bg-surface shadow-lg">
            <div className="container-page grid gap-3 py-4">
              <SearchForm id="q-mobile" />
              <nav aria-label="Mobile">
                <ul className="grid">
                  {NAV.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex min-h-12 items-center border-b border-line text-sm font-extrabold tracking-[0.08em] uppercase ${
                          item.sale ? "text-brand" : ""
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </div>
        </details>

        <Link
          href="/"
          aria-label="Heepzy home"
          className="font-display text-[28px] leading-none font-semibold tracking-[0.03em] uppercase lg:text-[34px]"
        >
          Heepzy
          <span aria-hidden="true" className="text-accent">
            .
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-6 xl:gap-7">
            {NAV.map((item) => {
              const cls = `${linkCls} ${item.sale ? "text-brand" : ""}`;
              return (
                <li key={item.href}>
                  {item.match ? (
                    <Suspense
                      fallback={
                        <Link href={item.href} className={cls}>
                          {item.label}
                        </Link>
                      }
                    >
                      <NavLink href={item.href} match={item.match} className={cls}>
                        {item.label}
                      </NavLink>
                    </Suspense>
                  ) : (
                    <Link href={item.href} className={cls}>
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <SearchForm id="q-desktop" className="mr-2 hidden w-64 md:block xl:w-72" />
          <ThemeToggle className="text-fg" />
          <Suspense fallback={<SignInLink />}>
            <AccountControl />
          </Suspense>
          <Suspense fallback={<CartLinkFallback />}>
            <CartLink />
          </Suspense>
          <CartDrawer />
        </div>
      </div>
    </header>
  );
}
