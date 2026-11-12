import { AuthCard } from "@/components/auth/auth-card";

export const metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return <AuthCard title="Sign in" mode="login" />;
}
