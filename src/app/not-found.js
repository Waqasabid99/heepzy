import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="container-page flex flex-1 flex-col items-start justify-center py-20">
      <h1 className="font-display text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-fg-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link href="/products" className="btn-primary mt-6">
        Browse shoes
      </Link>
    </main>
  );
}
