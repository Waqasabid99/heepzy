/** Shown while a page loads (loading.js). A calm ring in the brand colour, announced to screen readers. */
export function PageLoading({ label = "Loading", className = "" }) {
  return (
    <div role="status" aria-live="polite" className={`grid min-h-[50vh] flex-1 place-items-center px-4 py-16 ${className}`}>
      <div className="flex flex-col items-center gap-4">
        <span
          aria-hidden="true"
          className="size-11 animate-spin rounded-full border-[3px] border-line border-t-accent"
        />
        <p className="font-display text-sm tracking-[0.14em] text-fg-muted uppercase">{label}</p>
      </div>
    </div>
  );
}
