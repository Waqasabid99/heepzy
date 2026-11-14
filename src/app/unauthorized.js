import Link from "next/link";
import { StatusPage } from "@/components/layout/status-page";

export const metadata = { title: "Please sign in" };

export default function Unauthorized() {
  return (
    <StatusPage code="401" title="Please sign in" message="You need to be signed in to continue.">
      <Link href="/login" className="btn-primary">
        Sign in
      </Link>
      <Link href="/" className="btn-outline">
        Back to store
      </Link>
    </StatusPage>
  );
}
