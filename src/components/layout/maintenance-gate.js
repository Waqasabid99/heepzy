import { Suspense } from "react";
import Link from "next/link";
import { getStoreSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/session";
import { isStaff } from "@/lib/roles";
import { Settings, WhatsApp } from "@/components/ui/icons";

/**
 * Maintenance mode (Admin → Settings → Store). When off, renders the store
 * untouched without reading the session, so pages stay prerendered. When on,
 * customers see a "back soon" page; signed-in staff see the store with a banner.
 * This hides the store; it isn't an access-control boundary (pages are public anyway).
 */
export async function MaintenanceGate({ children }) {
  const s = await getStoreSettings();
  if (!s.maintenanceMode) return children;
  return (
    // Blank while the session is checked, so staff don't see the "back soon" page flash first.
    <Suspense fallback={null}>
      <StaffOrCustomer s={s}>{children}</StaffOrCustomer>
    </Suspense>
  );
}

async function StaffOrCustomer({ s, children }) {
  const user = await getCurrentUser();
  if (!isStaff(user?.role)) return <MaintenancePage s={s} />;
  return (
    <>
      <p
        role="status"
        className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-warning-bg px-4 py-2 text-center text-[13px] font-semibold text-warning"
      >
        <Settings className="size-4" /> Maintenance mode is on: customers see a &ldquo;back soon&rdquo; page.
        <Link href="/admin/settings" className="underline underline-offset-4">
          Turn it off
        </Link>
      </p>
      {children}
    </>
  );
}

function MaintenancePage({ s }) {
  const wa = s.whatsappNumber?.replace(/\D/g, "");
  return (
    <main id="main" className="grid min-h-dvh flex-1 place-items-center bg-bg px-4 py-16 text-center">
      <meta name="robots" content="noindex" />
      <div className="max-w-lg">
        <p className="font-display text-[34px] font-semibold tracking-[0.03em] uppercase">
          {s.storeName || "Heepzy"}
          <span className="text-brand">.</span>
        </p>
        <h1 className="mt-8 display text-[clamp(40px,7vw,72px)]">We&apos;ll be back soon</h1>
        <p className="mt-4 text-lg text-fg-muted">
          We&apos;re updating the store. Please check back in a little while.
        </p>
        {wa || s.supportPhone ? (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {wa ? (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary min-h-12"
              >
                <WhatsApp className="size-5" /> Message us on WhatsApp
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : null}
            {s.supportPhone ? (
              <a href={`tel:${s.supportPhone.replace(/\s/g, "")}`} className="btn-outline min-h-12">
                Call {s.supportPhone}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
