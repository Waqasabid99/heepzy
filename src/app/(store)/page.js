import Link from "next/link";

export default function HomePage() {
  return (
    <section className="container-page py-16 sm:py-24" aria-labelledby="hero-title">
      <p className="text-sm font-semibold tracking-wide text-accent uppercase">New season</p>
      <h1 id="hero-title" className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight sm:text-6xl">
        Shoes for every step, delivered across Pakistan.
      </h1>
      <p className="mt-4 max-w-prose-wide text-lg text-fg-muted">
        Storefront scaffold — the final design will be applied from the design references.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/products" className="btn-primary">
          Shop all shoes
        </Link>
        <Link href="/offers" className="btn-outline">
          View offers
        </Link>
      </div>
    </section>
  );
}
