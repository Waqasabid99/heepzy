import { Suspense } from "react";
import Link from "next/link";
import { AdminNav, AdminNavFallback } from "@/components/admin/admin-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ExternalLink } from "@/components/ui/icons";

export const metadata = {
  title: { default: "Admin", template: "%s · Heepzy Admin" },
  robots: { index: false, follow: false },
};

export default function AdminPanelLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg lg:flex-row">
      <aside className="bg-panel p-3 text-on-panel lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:p-4 lg:py-6">
        <Link href="/admin" className="mb-3 flex min-h-11 items-center gap-2 px-3.5 lg:mb-6">
          <span className="font-display text-[26px] leading-none font-semibold tracking-[0.03em] uppercase">
            Heepzy<span className="text-accent">.</span>
          </span>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-fg">Admin</span>
        </Link>
        <Suspense fallback={<AdminNavFallback />}>
          <AdminNav />
        </Suspense>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-end gap-2 border-b border-line bg-surface px-4 sm:px-6">
          <Link href="/" target="_blank" className="btn-ghost text-sm">
            View store <ExternalLink className="size-4" />
            <span className="sr-only">(opens in a new tab)</span>
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
