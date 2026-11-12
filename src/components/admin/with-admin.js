import { Suspense } from "react";
import { requireAdminPage } from "@/lib/session";

/**
 * Wrap EVERY admin page with this. Next.js renders layouts and pages
 * independently, so a check in the layout alone does NOT stop a page's
 * output from being sent to the browser. The page component below only
 * renders after the admin check passes.
 *
 * Also call `requireAdmin()` inside every admin server action and data
 * function (defence in depth — actions are reachable without the page).
 *
 *   export default withAdmin(async function OrdersPage({ admin, searchParams }) { ... });
 */
export function withAdmin(Page) {
  function AdminRoute(props) {
    return (
      <Suspense
        fallback={
          <p className="p-8 text-fg-muted" role="status">
            Loading…
          </p>
        }
      >
        <Guarded Page={Page} pageProps={props} />
      </Suspense>
    );
  }
  AdminRoute.displayName = `withAdmin(${Page.name || "Page"})`;
  return AdminRoute;
}

async function Guarded({ Page, pageProps }) {
  const admin = await requireAdminPage();
  return <Page {...pageProps} admin={admin} />;
}
