import Link from "next/link";
import { StatusPage } from "@/components/layout/status-page";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="Page not found"
      message="The page you're looking for doesn't exist or has moved. Check the address, or head back to the shoes."
    >
      <Link href="/products" className="btn-primary">
        Browse shoes
      </Link>
      <Link href="/" className="btn-outline">
        Go to home
      </Link>
    </StatusPage>
  );
}
