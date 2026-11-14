import { AdminTabs } from "@/components/admin/ui";

const TABS = [
  { href: "/admin/settings", label: "Store" },
  { href: "/admin/settings/payments", label: "Payments" },
  { href: "/admin/settings/delivery", label: "Delivery" },
  { href: "/admin/settings/tax", label: "Tax" },
  { href: "/admin/settings/returns", label: "Returns" },
];

export function SettingsTabs({ current }) {
  return <AdminTabs tabs={TABS} current={current} label="Settings sections" />;
}
