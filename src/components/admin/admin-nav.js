"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isOwner, OWNER_ONLY_PATHS } from "@/lib/roles";
import {
  Box,
  Grid,
  ImageIcon,
  Layers,
  ListIcon,
  Percent,
  Receipt,
  Settings,
  Star,
  Ticket,
  Undo,
  Users,
  WhatsApp,
} from "@/components/ui/icons";

export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", Icon: Grid, exact: true },
  { href: "/admin/orders", label: "Orders", Icon: Receipt },
  { href: "/admin/products", label: "Products", Icon: Box },
  { href: "/admin/inventory", label: "Inventory", Icon: Layers },
  { href: "/admin/customers", label: "Customers", Icon: Users },
  { href: "/admin/returns", label: "Returns & refunds", Icon: Undo },
  { href: "/admin/messages", label: "Messages", Icon: WhatsApp },
  { href: "/admin/reviews", label: "Reviews", Icon: Star },
  { href: "/admin/promotions", label: "Offers", Icon: Percent },
  { href: "/admin/coupons", label: "Vouchers", Icon: Ticket },
  { href: "/admin/content", label: "Banners", Icon: ImageIcon },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
  { href: "/admin/audit-log", label: "Audit log", Icon: ListIcon },
];

const linkCls =
  "flex min-h-11 items-center gap-3 rounded-xl px-3.5 font-semibold whitespace-nowrap text-on-panel-muted transition-colors hover:bg-on-panel/10 hover:text-on-panel aria-[current=page]:bg-on-panel aria-[current=page]:text-panel";
// Icon rail between md and lg: icons only, label kept for screen readers and as a tooltip.
const railCls = "md:justify-center md:px-0 lg:justify-start lg:px-3.5";

/**
 * Admin navigation; highlights the current section and hides owner-only
 * pages from managers. Render inside <Suspense> (reads the pathname).
 * `rail` = the sidebar (icons only between md and lg); otherwise the mobile menu list.
 */
export function AdminNav({ role, rail = false, badges = {} }) {
  const pathname = usePathname();
  return (
    <NavList
      role={role}
      rail={rail}
      badges={badges}
      isActive={(i) => (i.exact ? pathname === i.href : pathname.startsWith(i.href))}
    />
  );
}

/** Static fallback (no active state, no owner-only items) for the Suspense boundary. */
export function AdminNavFallback({ rail = false }) {
  return <NavList role={null} rail={rail} isActive={() => false} />;
}

function NavList({ role, rail, isActive, badges = {} }) {
  const items = ADMIN_NAV.filter((i) => isOwner(role) || !OWNER_ONLY_PATHS.includes(i.href));
  return (
    <nav aria-label="Admin">
      <ul className="grid gap-0.5 text-sm">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              title={rail ? item.label : undefined}
              aria-current={isActive(item) ? "page" : undefined}
              className={`${linkCls} ${rail ? railCls : ""}`}
            >
              <span className="relative shrink-0">
                <item.Icon className="size-[18px]" />
                {badges[item.href] ? (
                  <span
                    aria-hidden="true"
                    className={`absolute -top-1.5 -right-2 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] leading-4 font-bold text-accent-fg ${rail ? "lg:hidden" : "hidden"}`}
                  >
                    {badges[item.href] > 99 ? "99+" : badges[item.href]}
                  </span>
                ) : null}
              </span>
              <span className={rail ? "md:sr-only lg:not-sr-only" : ""}>{item.label}</span>
              {badges[item.href] ? (
                <span
                  className={`ml-auto rounded-full bg-accent px-2 text-[11px] leading-5 font-bold text-accent-fg ${rail ? "hidden lg:inline" : ""}`}
                >
                  {badges[item.href]}
                  <span className="sr-only"> waiting</span>
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
