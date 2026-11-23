import { AuthCard } from "@/components/auth/auth-card";

export const metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <main id="main" className="flex flex-1 items-center bg-muted">
      <AuthCard title="Mr. Shoes admin" mode="admin" />
    </main>
  );
}
