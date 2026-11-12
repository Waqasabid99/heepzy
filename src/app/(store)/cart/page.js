import { PagePlaceholder } from "@/components/ui/page-placeholder";

export const metadata = { title: "Your cart" };

export default function Page() {
  return (
    <PagePlaceholder
      title="Your cart"
      description="Works for guests (signed cookie) and signed-in customers; carts merge on login."
    />
  );
}
