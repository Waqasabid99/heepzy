"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Exchange, Home, Receipt, Settings } from "@/components/ui/icons";

export const ACCOUNT_NAV = [
  { href: "/account", label: "Overview", short: "Home", Icon: Home, exact: true },
  { href: "/account/orders", label: "Orders", short: "Orders", Icon: Receipt },
  { href: "/account/returns", label: "Returns & exchanges", short: "Returns", Icon: Exchange },
  { href: "/account/settings", label: "Settings", short: "Settings", Icon: Settings },
];

const useActive = () => {
  const pathname = usePathname();
  return (i) => (i.exact ? pathname === i.href : pathname.startsWith(i.href));
};

/** Sidebar list (lg and up). Render inside <Suspense>. */
export function AccountNav() {
  return <AccountNavList isActive={useActive()} />;
}

export function AccountNavList({ isActive = () => false }) {
  return (
    <nav aria-label="Your account" className="hidden lg:block">
      <ul className="grid gap-1">
        {ACCOUNT_NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={isActive(item) ? "page" : undefined}
              className="flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold text-fg-muted transition-colors hover:bg-muted hover:text-fg aria-[current=page]:bg-fg aria-[current=page]:text-bg"
            >
              <item.Icon className="size-[18px] shrink-0" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** App-style tab bar fixed to the bottom of the screen on phones and tablets. Render inside <Suspense>. */
export function AccountBottomNav() {
  return <AccountBottomNavList isActive={useActive()} />;
}

export function AccountBottomNavList({ isActive = () => false }) {
  return (
    <nav
      aria-label="Your account"
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-[0_10px_40px_rgb(0_0_0/0.18)] backdrop-blur">
        {ACCOUNT_NAV.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-fg-muted transition-colors aria-[current=page]:font-extrabold aria-[current=page]:text-fg"
              >
                <item.Icon className="size-[22px]" strokeWidth={active ? 2.3 : 1.8} />
                {item.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
