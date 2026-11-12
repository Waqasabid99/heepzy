import Link from "next/link";

export default function Forbidden() {
  return (
    <main id="main" className="container-page flex flex-1 flex-col items-start justify-center py-20">
      <h1 className="font-display text-3xl font-semibold">Access denied</h1>
      <p className="mt-2 text-fg-muted">You don&apos;t have permission to view this page.</p>
      <Link href="/" className="btn-primary mt-6">
        Back to store
      </Link>
    </main>
  );
}
