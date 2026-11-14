import { Suspense } from "react";
import Link from "next/link";
import { AdminNav, AdminNavFallback } from "@/components/admin/admin-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ExternalLink } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/session";
import { isStaff, ROLE_LABELS } from "@/lib/roles";

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
          <StaffNav />
        </Suspense>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-end gap-2 border-b border-line bg-surface px-4 sm:px-6">
          <Suspense fallback={null}>
            <SignedInAs />
          </Suspense>
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

/** Nav for the signed-in staff member's role. */
async function StaffNav() {
  const user = await getCurrentUser();
  return <AdminNav role={user?.role ?? null} />;
}

async function SignedInAs() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) return null;
  return (
    <p className="mr-auto text-[13px] text-fg-muted">
      <span className="font-semibold text-fg">{user.name}</span> · {ROLE_LABELS[user.role]}
    </p>
  );
}
