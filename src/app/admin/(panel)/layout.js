import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const metadata = {
  title: { default: "Admin", template: "%s · Heepzy Admin" },
  robots: { index: false, follow: false },
};

export default function AdminPanelLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-wrap bg-bg">
      <aside className="w-full bg-panel p-4 text-on-panel lg:w-64 lg:shrink-0 lg:py-7">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-3.5 font-display text-2xl font-medium">
          Heepzy
          <span className="rounded-full bg-accent px-2 py-0.5 font-sans text-[11px] font-bold text-accent-fg">
            Admin
          </span>
        </Link>
        <AdminNav />
      </aside>
      <div className="flex min-w-0 flex-[999_1_560px] flex-col">
        <header className="flex min-h-16 items-center justify-end gap-2 border-b border-line bg-surface px-6">
          <Link href="/" className="btn-ghost text-sm">
            View store
          </Link>
          <ThemeToggle className="border border-line" />
        </header>
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
