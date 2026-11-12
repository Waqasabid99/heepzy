import Link from "next/link";

export default function Unauthorized() {
  return (
    <main id="main" className="container-page flex flex-1 flex-col items-start justify-center py-20">
      <h1 className="font-display text-3xl font-semibold">Please sign in</h1>
      <p className="mt-2 text-fg-muted">You need to be signed in to continue.</p>
      <Link href="/login" className="btn-primary mt-6">
        Sign in
      </Link>
    </main>
  );
}
