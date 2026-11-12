import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getRelatedProducts } from "@/lib/catalog";
import { getStoreSettings } from "@/lib/settings";
import { formatPKR } from "@/lib/money";
import { BuyBox } from "@/components/store/buy-box";
import { ProductCard } from "@/components/store/product-card";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Product not found" };
  return {
    title: p.metaTitle || p.name,
    description: p.shortDescription,
    openGraph: { images: p.images[0] ? [{ url: p.images[0].url, alt: p.images[0].alt }] : [] },
  };
}

export default function ProductPage({ params }) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetails params={params} />
    </Suspense>
  );
}

async function ProductDetails({ params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const [settings, related] = await Promise.all([getStoreSettings(), getRelatedProducts(slug, product.category?.slug)]);
  const [main, ...rest] = product.images;

  return (
    <div className="container-page pt-10 pb-28">
      <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-fg-muted">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href="/" className="hover:text-fg">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          {product.category ? (
            <>
              <li>
                <Link href={`/products?category=${product.category.slug}`} className="hover:text-fg">
                  {product.category.name}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
            </>
          ) : null}
          <li aria-current="page" className="text-fg">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid items-start gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        {/* Gallery */}
        <section aria-label="Product images" className="flex flex-col gap-3.5 lg:sticky lg:top-28">
          <div className="relative aspect-square overflow-hidden rounded-[28px] bg-muted">
            {main ? (
              <Image
                src={main.url}
                alt={main.alt}
                fill
                priority
                sizes="(min-width: 1024px) 52vw, 100vw"
                className="object-cover"
              />
            ) : null}
            {product.compareAt ? (
              <span className="absolute top-5 left-5 rounded-full bg-sale px-3.5 py-1.5 text-xs font-bold text-white">
                Save {formatPKR(product.compareAt - product.price)}
              </span>
            ) : null}
          </div>
          {rest.length ? (
            <div className="grid grid-cols-4 gap-3.5">
              {rest.map((img) => (
                <div key={img.url} className="relative aspect-square overflow-hidden rounded-[18px] bg-muted">
                  <Image src={img.url} alt={img.alt} fill sizes="12vw" className="object-cover" />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* Buy box */}
        <section aria-labelledby="pdp-title" className="flex flex-col gap-7">
          <div>
            <p className="mb-2 text-[13px] font-semibold text-fg-muted">
              {[product.gender, product.category?.name].filter(Boolean).join(" · ")}
            </p>
            <h1 id="pdp-title" className="display text-[clamp(44px,4.6vw,68px)] leading-none font-medium">
              {product.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <p className={`font-display text-[32px] font-medium ${product.compareAt ? "text-sale" : ""}`}>
                {formatPKR(product.price)}
              </p>
              {product.compareAt ? (
                <p className="text-fg-muted">
                  <span className="sr-only">Was </span>
                  <s>{formatPKR(product.compareAt)}</s>
                </p>
              ) : null}
              {product.rating.count > 0 ? (
                <a href="#reviews" className="text-[13px] link-underline">
                  {product.rating.average.toFixed(1)} ★ · {product.rating.count} reviews
                </a>
              ) : null}
            </div>
            <p className="mt-1.5 text-[13px] text-fg-muted">
              {settings.pricesIncludeTax ? "Inclusive of GST." : "Excludes GST."} Delivery calculated at checkout.
            </p>
          </div>

          <p className="text-fg-muted">{product.shortDescription}</p>

          <BuyBox product={product} />

          <ul className="grid gap-3 rounded-[20px] bg-muted p-5 text-sm">
            {settings.freeDeliveryEnabled && settings.freeDeliveryThreshold ? (
              <li className="flex gap-3">
                <TruckIcon />
                <span>
                  <strong>Free delivery</strong> on orders above {formatPKR(settings.freeDeliveryThreshold)}
                </span>
              </li>
            ) : null}
            {settings.codEnabled ? (
              <li className="flex gap-3">
                <CardIcon />
                <span>
                  <strong>Cash on delivery</strong> or pay securely by card / wallet
                </span>
              </li>
            ) : null}
            {settings.returnsEnabled ? (
              <li className="flex gap-3">
                <ReturnIcon />
                <span>
                  <strong>{settings.returnWindowDays}-day exchange</strong> on unworn pairs
                </span>
              </li>
            ) : null}
          </ul>

          <div className="border-t border-line">
            <details open className="group border-b border-line">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between font-bold">
                Details &amp; materials
                <span aria-hidden="true" className="text-xl transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <div className="pb-5 text-sm text-fg-muted">
                <p>{product.description}</p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
                  {product.material ? (
                    <>
                      <dt className="font-semibold text-fg">Material</dt>
                      <dd>{product.material}</dd>
                    </>
                  ) : null}
                  {product.brand ? (
                    <>
                      <dt className="font-semibold text-fg">Brand</dt>
                      <dd>{product.brand}</dd>
                    </>
                  ) : null}
                </dl>
              </div>
            </details>
            <details className="group border-b border-line">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between font-bold">
                Delivery &amp; returns
                <span aria-hidden="true" className="text-xl transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-5 text-sm text-fg-muted">
                Delivered in 2–4 working days to major cities and 3–6 days elsewhere in Pakistan.
                {settings.returnsEnabled
                  ? ` Unworn pairs can be exchanged or returned within ${settings.returnWindowDays} days.`
                  : ""}
              </p>
            </details>
            <details className="group border-b border-line">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between font-bold">
                Care guide
                <span aria-hidden="true" className="text-xl transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-5 text-sm text-fg-muted">
                Wipe clean with a soft, damp cloth. Air dry away from direct heat. Use shoe trees for leather pairs.
              </p>
            </details>
          </div>
        </section>
      </div>

      {/* Reviews */}
      <section id="reviews" aria-labelledby="rev-title" className="mt-28 grid gap-10 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-4">
          <h2 id="rev-title" className="heading text-[44px]">
            Reviews
          </h2>
          {product.rating.count > 0 ? (
            <p className="flex items-baseline gap-3">
              <span className="font-display text-6xl">{product.rating.average.toFixed(1)}</span>
              <span className="text-sm text-fg-muted">out of 5 · {product.rating.count} reviews</span>
            </p>
          ) : (
            <p className="text-fg-muted">No reviews yet. Bought this pair? Tell others how it fits.</p>
          )}
          <Link href="/account/orders" className="btn-outline self-start">
            Write a review
          </Link>
        </div>
        <div className="grid gap-4">
          {product.reviews.map((r) => (
            <article key={r.id} className="flex flex-col gap-2.5 card p-7">
              <p aria-label={`${r.rating} out of 5 stars`} className="tracking-[2px]">
                {"★".repeat(r.rating)}
                <span className="text-line">{"★".repeat(5 - r.rating)}</span>
              </p>
              {r.title ? <h3 className="font-bold">{r.title}</h3> : null}
              {r.body ? <p className="text-sm text-fg-muted">{r.body}</p> : null}
              <p className="text-[13px]">
                <strong>{r.user}</strong>
                {r.isVerifiedPurchase ? <span className="font-semibold text-success"> · Verified purchase</span> : null}
              </p>
            </article>
          ))}
        </div>
      </section>

      {related.length ? (
        <section aria-labelledby="rel-title" className="mt-28">
          <h2 id="rel-title" className="mb-9 heading text-[clamp(36px,3.6vw,52px)]">
            You may also like
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} sizes="(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 92vw" />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="container-page grid gap-12 pt-20 pb-28 lg:grid-cols-[1.15fr_1fr]" aria-busy="true">
      <p className="sr-only" role="status">
        Loading product…
      </p>
      <div className="aspect-square rounded-[28px] bg-muted" />
      <div className="flex flex-col gap-5">
        <div className="h-16 w-3/4 rounded-2xl bg-muted" />
        <div className="h-10 w-40 rounded-2xl bg-muted" />
        <div className="h-40 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

const iconProps = {
  "aria-hidden": true,
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  className: "shrink-0",
};
function TruckIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </svg>
  );
}
function CardIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}
function ReturnIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5" />
    </svg>
  );
}
