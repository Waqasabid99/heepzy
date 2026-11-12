import Link from "next/link";

export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/returns", label: "Returns & refunds" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/promotions", label: "Offers" },
  { href: "/admin/coupons", label: "Vouchers" },
  { href: "/admin/content", label: "Banners" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit-log", label: "Audit log" },
];

export function AdminNav() {
  return (
    <nav aria-label="Admin">
      <ul className="grid gap-0.5 text-sm">
        {ADMIN_NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex min-h-11 items-center rounded-xl px-3.5 font-semibold text-on-panel-muted transition-colors hover:bg-on-panel/10 hover:text-on-panel"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
