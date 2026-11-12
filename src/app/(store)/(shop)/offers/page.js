import Link from "next/link";
import { listProducts, parseFilters } from "@/lib/catalog";
import { ProductCard } from "@/components/store/product-card";

export const metadata = { title: "Offers", description: "Shoes on sale at Heepzy — limited sizes, while stocks last." };

export default async function OffersPage() {
  const { products } = await listProducts(parseFilters({ sale: "1", sort: "featured" }));
  return (
    <div className="container-page pt-10 pb-28">
      <section className="mb-14 overflow-hidden rounded-panel bg-accent px-6 py-14 text-accent-fg sm:px-12">
        <p className="text-xs font-bold tracking-[0.16em] uppercase">Limited time</p>
        <h1 className="mt-3 display text-[clamp(56px,8vw,128px)]">Flash Drop</h1>
        <p className="mt-4 max-w-md font-medium">
          Up to 25% off selected styles. Sizes go fast — when they&apos;re gone, they&apos;re gone.
        </p>
      </section>
      {products.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 3} />
          ))}
        </div>
      ) : (
        <div className="rounded-card bg-muted p-12 text-center">
          <p className="heading text-3xl">No offers running right now.</p>
          <Link href="/products" className="btn-ink mt-6">
            Browse all shoes
          </Link>
        </div>
      )}
    </div>
  );
}
