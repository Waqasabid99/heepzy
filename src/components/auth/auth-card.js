import { Suspense } from "react";
import { AuthForm } from "./auth-form";

export function AuthCard({ title, mode }) {
  return (
    <section className="container-page flex justify-center py-12 sm:py-20" aria-labelledby="auth-title">
      <div className="w-full max-w-md card p-6 sm:p-8">
        <h1 id="auth-title" className="mb-6 font-display text-2xl font-semibold">
          {title}
        </h1>
        <Suspense>
          <AuthForm mode={mode} />
        </Suspense>
      </div>
    </section>
  );
}
