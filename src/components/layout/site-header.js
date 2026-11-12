import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const NAV = [
  { href: "/products?gender=men", label: "Men" },
  { href: "/products?gender=women", label: "Women" },
  { href: "/products?gender=kids", label: "Kids" },
  { href: "/offers", label: "Offers" },
  { href: "/size-guide", label: "Size guide" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Heepzy
        </Link>

        <nav aria-label="Primary" className="ml-6 hidden md:block">
          <ul className="flex items-center gap-6 text-sm font-medium">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-fg-muted transition-colors hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Link href="/account" className="btn-ghost px-3" aria-label="Account">
            Account
          </Link>
          <Link href="/cart" className="btn-ghost px-3" aria-label="Shopping cart">
            Cart
          </Link>
        </div>
      </div>

      {/* Mobile navigation: native disclosure, works without JavaScript */}
      <details className="border-t border-border md:hidden">
        <summary className="container-page flex min-h-11 cursor-pointer items-center text-sm font-medium">Menu</summary>
        <nav aria-label="Mobile">
          <ul className="container-page grid gap-1 pb-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block rounded-control px-2 py-2.5 hover:bg-surface-muted">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </details>
    </header>
  );
}
