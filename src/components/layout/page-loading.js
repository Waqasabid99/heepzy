/**
 * Loading screens (loading.js). Skeletons that mirror the page layout, plus a thin
 * progress bar, so navigation feels instant instead of showing a blank spinner.
 */
const bar = "rounded-md bg-muted animate-pulse";

function Block({ className = "" }) {
  return <div aria-hidden="true" className={`${bar} ${className}`} />;
}

function Shell({ label, children }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex-1">
      <div aria-hidden="true" className="loading-bar" />
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Admin pages: heading, a row of stat cards, a toolbar and a table. */
export function AdminLoading({ label = "Loading" }) {
  return (
    <Shell label={label}>
      <div className="p-4 sm:p-6 lg:p-8">
        <Block className="h-9 w-56 sm:w-72" />
        <Block className="mt-3 h-4 w-72 max-w-full" />

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-line bg-surface p-5">
              <Block className="h-3 w-20" />
              <Block className="mt-4 h-8 w-32" />
              <Block className="mt-3 h-3 w-40 max-w-full" />
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-surface">
          <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
            <Block className="h-10 w-full sm:w-64" />
            <Block className="h-10 w-24 rounded-full" />
            <Block className="h-10 w-24 rounded-full" />
          </div>
          <ul>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex items-center gap-4 border-b border-line p-4 last:border-b-0">
                <Block className="size-10 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <Block className="h-4 w-2/5" />
                  <Block className="mt-2 h-3 w-3/5" />
                </div>
                <Block className="hidden h-6 w-20 rounded-full sm:block" />
                <Block className="h-4 w-16" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Shell>
  );
}

/** Storefront pages: title, filter chips and a grid of product cards. */
export function ShopLoading({ label = "Loading" }) {
  return (
    <Shell label={label}>
      <div className="container-page py-8">
        <Block className="h-4 w-40" />
        <Block className="mt-6 h-12 w-64 sm:w-96" />
        <div className="mt-6 flex gap-3 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <Block key={i} className="h-11 w-28 shrink-0 rounded-full" />
          ))}
        </div>
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i}>
              <Block className="aspect-square w-full rounded-none" />
              <Block className="mt-4 h-3 w-3/4" />
              <Block className="mt-2 h-3 w-1/2" />
              <Block className="mt-3 h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
