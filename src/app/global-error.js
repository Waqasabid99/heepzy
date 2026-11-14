"use client";

/**
 * Last resort: replaces the whole document when the root layout itself fails.
 * It can't use the site's CSS or fonts, so it is self-contained.
 */
export default function GlobalError({ error, retry, reset }) {
  const again = retry ?? reset;
  return (
    <html lang="en-PK">
      <head>
        <title>Something went wrong · Heepzy</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "1.5rem",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          background: "#ffffff",
          color: "#1a1a1a",
          textAlign: "center",
        }}
      >
        <main>
          <p style={{ margin: 0, fontSize: "5rem", fontWeight: 700, lineHeight: 1, color: "#d3122a" }}>500</p>
          <h1 style={{ margin: "0.5rem 0 0", fontSize: "1.75rem", textTransform: "uppercase" }}>Something went wrong</h1>
          <p style={{ margin: "0.75rem auto 0", maxWidth: "28rem", color: "#555" }}>
            We hit an unexpected problem. Please try again in a moment.
          </p>
          {error?.digest ? (
            <p style={{ margin: "0.75rem 0 0", fontSize: "0.75rem", color: "#555" }}>Reference: {error.digest}</p>
          ) : null}
          <div style={{ marginTop: "1.75rem", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            {again ? (
              <button
                type="button"
                onClick={() => again()}
                style={{
                  minHeight: 48,
                  padding: "0 1.5rem",
                  border: 0,
                  background: "#d3122a",
                  color: "#fff",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
            ) : null}
            {/* A full reload on purpose: the app shell is broken here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                minHeight: 48,
                padding: "0 1.5rem",
                display: "inline-grid",
                placeItems: "center",
                border: "1px solid #1a1a1a",
                color: "#1a1a1a",
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Go to home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
