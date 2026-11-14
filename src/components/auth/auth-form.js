"use client";

import { PasswordInput } from "@/components/ui/password-input";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { isStaff } from "@/lib/roles";

const COPY = {
  login: { submit: "Sign in", pending: "Signing in…" },
  register: { submit: "Create account", pending: "Creating account…" },
  admin: { submit: "Sign in to admin", pending: "Signing in…" },
};

/** mode: "login" | "register" | "admin" */
export function AuthForm({ mode = "login" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const fallback = mode === "admin" ? "/admin" : "/account";
  const next = safeRedirectPath(searchParams.get("next"), fallback);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    try {
      if (mode === "register") {
        const { error } = await authClient.signUp.email({
          name: String(form.get("name") || "").trim(),
          email,
          password,
        });
        if (error)
          throw new Error(
            error.status === 429
              ? "Too many attempts. Please wait a minute."
              : error.message || "Could not create account.",
          );
      } else {
        const { data, error } = await authClient.signIn.email({ email, password });
        if (error) {
          throw new Error(
            error.status === 429 ? "Too many attempts. Please wait a minute." : "Incorrect email or password.",
          );
        }
        if (mode === "admin" && !isStaff(data?.user?.role)) {
          await authClient.signOut();
          throw new Error("This account does not have admin access.");
        }
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-4"
      noValidate={false}
      aria-describedby={error ? "auth-error" : undefined}
    >
      {mode === "register" ? (
        <div>
          <label htmlFor="name" className="label">
            Full name
          </label>
          <input id="name" name="name" className="input" autoComplete="name" required maxLength={120} />
        </div>
      ) : null}
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" className="input" autoComplete="email" required maxLength={191} />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <PasswordInput
          id="password"
          name="password"
          className="input"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          required
          minLength={8}
          maxLength={128}
        />
      </div>

      <p id="auth-error" role="alert" aria-live="assertive" className="min-h-5 text-sm text-sale">
        {error}
      </p>

      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? COPY[mode].pending : COPY[mode].submit}
      </button>

      {mode === "login" ? (
        <p className="text-center text-sm text-fg-muted">
          New to Heepzy?{" "}
          <Link href="/register" className="font-medium text-fg underline">
            Create an account
          </Link>
        </p>
      ) : null}
      {mode === "register" ? (
        <p className="text-center text-sm text-fg-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-fg underline">
            Sign in
          </Link>
        </p>
      ) : null}
    </form>
  );
}
