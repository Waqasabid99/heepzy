import Link from "next/link";
import { StatusPage } from "@/components/layout/status-page";

export const metadata = { title: "Access denied" };

export default function Forbidden() {
  return (
    <StatusPage code="403" title="Access denied" message="You don't have permission to view this page.">
      <Link href="/" className="btn-primary">
        Back to store
      </Link>
      <Link href="/account" className="btn-outline">
        My account
      </Link>
    </StatusPage>
  );
}
