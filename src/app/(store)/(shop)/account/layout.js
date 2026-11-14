import { Suspense } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { AccountBottomNav, AccountBottomNavList, AccountNav, AccountNavList } from "@/components/store/account-nav";
import { SignOutButton } from "@/components/store/account-forms";

/**
 * Account area: section navigation beside the page (above it on phones).
 * Visitors who aren't signed in (e.g. reading the returns policy) get a sign-in card instead.
 */
export default function AccountLayout({ children }) {
  return (
    <div className="container-page grid grid-cols-1 gap-0 py-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:py-12">
      <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
        <Suspense fallback={<AccountNavList />}>
          <Sidebar />
        </Suspense>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

async function Sidebar() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="mb-6 rounded-2xl bg-muted p-5 lg:mb-0">
        <p className="font-bold">Your account</p>
        <p className="mt-1 text-sm text-fg-muted">Sign in to see your orders, returns and saved addresses.</p>
        <Link href="/login?next=/account" className="btn-ink mt-4 min-h-11 w-full">
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <>
      <p className="mb-3 hidden truncate px-4 text-sm text-fg-muted lg:block">
        Signed in as <span className="font-bold text-fg">{user.name}</span>
      </p>
      <AccountNav />
      <div className="mt-4 hidden px-1 lg:block">
        <SignOutButton />
      </div>
      <Suspense fallback={<AccountBottomNavList />}>
        <AccountBottomNav />
      </Suspense>
    </>
  );
}
