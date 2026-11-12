/** Temporary scaffold for routes whose UI will be built from the design references. */
export function PagePlaceholder({ title, description, children }) {
  return (
    <section className="container-page py-12 sm:py-16" aria-labelledby="page-title">
      <h1 id="page-title" className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      {description ? <p className="mt-3 max-w-prose-wide text-fg-muted">{description}</p> : null}
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}
