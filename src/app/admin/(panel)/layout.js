import { Suspense } from "react";
import Link from "next/link";
import { AdminNav, AdminNavFallback } from "@/components/admin/admin-nav";
import { AdminMobileMenu } from "@/components/admin/admin-mobile-menu";
import { AccountMenu } from "@/components/layout/account-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ExternalLink } from "@/components/ui/icons";
import { getCurrentUser } from "@/lib/session";
import { isStaff, ROLE_LABELS } from "@/lib/roles";
import { pendingMessageCount } from "@/lib/admin/messages";
import { BRAND_HOME_LABEL, Wordmark } from "@/components/brand/wordmark";
import { BRAND } from "@/lib/brand";

export const metadata = {
  title: { default: "Admin", template: `%s · ${BRAND.name} Admin` },
  robots: { index: false, follow: false },
};

const Logo = ({ compact = false }) => (
  <span className="flex items-center gap-2">
    {compact ? (
      <span className="font-display text-[26px] leading-none font-semibold uppercase">
        M<span className="text-accent">.</span>
      </span>
    ) : (
      <Wordmark className="text-[24px]" />
    )}
    {compact ? null : (
      <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-fg">Admin</span>
    )}
  </span>
);

export default function AdminPanelLayout({ children }) {
  return (
    <div className="flex min-h-dvh flex-1 bg-bg">
      {/* Sidebar: icon rail on tablets, full width from lg. Phones use the menu in the top bar. */}
      <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col overflow-y-auto bg-panel p-3 py-5 text-on-panel md:flex md:w-[76px] lg:w-64 lg:p-4 lg:py-6">
        <Link
          href="/admin"
          aria-label="Admin dashboard"
          className="mb-6 flex min-h-11 items-center justify-center lg:justify-start lg:px-3.5"
        >
          <span className="lg:hidden">
            <Logo compact />
          </span>
          <span className="hidden lg:block">
            <Logo />
          </span>
        </Link>
        <Suspense fallback={<AdminNavFallback rail />}>
          <StaffNav rail />
        </Suspense>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex min-h-16 items-center justify-end gap-2 border-b border-line bg-surface px-3 sm:px-6">
          <AdminMobileMenu>
            <Suspense fallback={<AdminNavFallback />}>
              <StaffNav />
            </Suspense>
          </AdminMobileMenu>
          <Link href="/admin" className="mr-auto md:hidden" aria-label="Admin dashboard">
            <Logo />
          </Link>
          <Link href="/" target="_blank" className="btn-ghost px-3 text-sm sm:px-4">
            <span className="hidden sm:inline">View store</span> <ExternalLink className="size-4" />
            <span className="sr-only">
              <span className="sm:hidden">View store</span> (opens in a new tab)
            </span>
          </Link>
          <ThemeToggle className="border border-line" />
          <Suspense fallback={<span aria-hidden="true" className="size-11" />}>
            <AdminAccount />
          </Suspense>
        </header>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Nav for the signed-in staff member's role. */
async function StaffNav({ rail = false }) {
  const user = await getCurrentUser();
  const waiting = isStaff(user?.role) ? await pendingMessageCount() : 0;
  return <AdminNav role={user?.role ?? null} rail={rail} badges={{ "/admin/messages": waiting }} />;
}

/** The same name/initial menu as the storefront header: pages, account and sign out. */
async function AdminAccount() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) return null;
  return <AccountMenu name={user.name} staff roleLabel={ROLE_LABELS[user.role]} />;
}
