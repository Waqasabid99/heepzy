import Link from "next/link";
import { BRAND_HOME_LABEL, Wordmark } from "@/components/brand/wordmark";

/**
 * Full-page message for 404, access denied, errors… Stands alone (its own small
 * header), so it works even where the store or admin chrome isn't rendered.
 * Pass `compact` to use it inside an existing layout (e.g. the admin panel).
 */
export function StatusPage({ code, title, message, reference, compact = false, children }) {
  const body = (
    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
      {code ? (
        <p
          aria-hidden="true"
          className="font-display text-[clamp(5rem,22vw,9rem)] leading-none font-semibold text-accent"
        >
          {code}
        </p>
      ) : null}
      <h1 className="mt-2 font-display text-3xl leading-tight font-semibold uppercase sm:text-4xl">{title}</h1>
      <p className="mt-3 text-fg-muted">{message}</p>
      {reference ? (
        <p className="mt-3 text-xs text-fg-muted">
          Reference: <span className="font-mono">{reference}</span>
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>
    </div>
  );

  if (compact) {
    return (
      <main id="main" tabIndex={-1} className="grid flex-1 place-items-center px-4 py-16 focus:outline-none">
        {body}
      </main>
    );
  }
  return (
    <>
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center">
          <Link href="/" aria-label={BRAND_HOME_LABEL}>
            <Wordmark className="text-[26px]" />
          </Link>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="container-page grid flex-1 place-items-center py-16 focus:outline-none">
        {body}
      </main>
    </>
  );
}
