"use client";

export default function GlobalError({ reset }) {
  return (
    <html lang="en-PK">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem" }}>
        <h1>Something went wrong</h1>
        <p>Please try again. If the problem continues, contact support.</p>
        <button type="button" onClick={() => reset()}>
          Try again
        </button>
      </body>
    </html>
  );
}
