/** Temporary scaffold for routes whose full UI is still to be built. */
export function PagePlaceholder({ title, description, children }) {
  return (
    <section className="container-page py-12 sm:py-16" aria-labelledby="page-title">
      <h1 id="page-title" className="display text-[clamp(44px,5.5vw,80px)]">
        {title}
      </h1>
      {description ? <p className="mt-4 max-w-prose-wide text-fg-muted">{description}</p> : null}
      {children ? <div className="mt-10">{children}</div> : null}
    </section>
  );
}
