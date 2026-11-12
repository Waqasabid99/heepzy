import { AuthCard } from "@/components/auth/auth-card";

export const metadata = { title: "Create account", robots: { index: false } };

export default function RegisterPage() {
  return <AuthCard title="Create your account" mode="register" />;
}
