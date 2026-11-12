import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const metadata = {
  title: { default: "Admin", template: "%s · Heepzy Admin" },
  robots: { index: false, follow: false },
};

export default function AdminPanelLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-1">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface p-4 lg:block">
        <Link href="/admin" className="mb-6 block px-3 font-display text-lg font-bold">
          Heepzy Admin
        </Link>
        <AdminNav />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-2 border-b border-border bg-surface px-4">
          <Link href="/" className="btn-ghost px-3 text-sm">
            View store
          </Link>
          <ThemeToggle />
        </header>
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
