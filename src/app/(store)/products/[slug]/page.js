import { Suspense } from "react";
import { PagePlaceholder } from "@/components/ui/page-placeholder";

export default function ProductPage({ params }) {
  return (
    <Suspense fallback={<PagePlaceholder title="Loading…" />}>
      <ProductDetails params={params} />
    </Suspense>
  );
}

async function ProductDetails({ params }) {
  const { slug } = await params;
  return (
    <PagePlaceholder
      title={`Product: ${slug}`}
      description="Gallery, colour & size picker, size chart, stock status, reviews and add-to-cart."
    />
  );
}
