"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "@/components/ui/icons";

export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard", Icon: Grid, exact: true },
  { href: "/admin/orders", label: "Orders", Icon: Receipt },
  { href: "/admin/products", label: "Products", Icon: Box },
  { href: "/admin/inventory", label: "Inventory", Icon: Layers },
  { href: "/admin/customers", label: "Customers", Icon: Users },
  { href: "/admin/returns", label: "Returns & refunds", Icon: Undo },
  { href: "/admin/reviews", label: "Reviews", Icon: Star },
  { href: "/admin/promotions", label: "Offers", Icon: Percent },
  { href: "/admin/coupons", label: "Vouchers", Icon: Ticket },
  { href: "/admin/content", label: "Banners", Icon: ImageIcon },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
  { href: "/admin/audit-log", label: "Audit log", Icon: ListIcon },
];

const linkCls =
  "flex min-h-11 whitespace-nowrap items-center gap-3 rounded-xl px-3.5 font-semibold text-on-panel-muted transition-colors hover:bg-on-panel/10 hover:text-on-panel aria-[current=page]:bg-on-panel aria-[current=page]:text-panel";

/** Sidebar navigation; highlights the current section. Render inside <Suspense> (reads the pathname). */
export function AdminNav() {
  const pathname = usePathname();
  return <NavList isActive={(i) => (i.exact ? pathname === i.href : pathname.startsWith(i.href))} />;
}

/** Static fallback (no active state) for the Suspense boundary. */
export function AdminNavFallback() {
  return <NavList isActive={() => false} />;
}

function NavList({ isActive }) {
  return (
    <nav aria-label="Admin">
      <ul className="scroll-row gap-1 text-sm lg:grid lg:gap-0.5 lg:overflow-visible">
        {ADMIN_NAV.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link href={item.href} aria-current={isActive(item) ? "page" : undefined} className={linkCls}>
              <item.Icon className="size-[18px] shrink-0" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
