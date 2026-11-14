import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getRelatedProducts } from "@/lib/catalog";
import { getStoreSettings } from "@/lib/settings";
import { FIT_LABELS } from "@/lib/review-labels";
import { formatPKR } from "@/lib/money";
import { BuyBox } from "@/components/store/buy-box";
import { ProductCard } from "@/components/store/product-card";
import { Star } from "@/components/ui/icons";

const offerEnds = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Karachi",
});

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
  const single = product.images.length === 1;

  return (
    <div className="container-page pt-4 pb-28">
      <nav aria-label="Breadcrumb" className="mb-4 text-[13px] text-fg-muted short:sr-only">
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

      <div className="grid items-start gap-10 lg:grid-cols-[1.7fr_1fr] lg:gap-14">
        {/* Gallery: 2-column grid on desktop, swipeable carousel on phones */}
        <section aria-label="Product images" className="min-w-0">
          <ul className="-mx-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0 md:grid md:grid-cols-2 md:overflow-visible md:pb-0">
            {product.images.map((img, i) => (
              <li
                key={img.url}
                className={`relative aspect-square w-[86%] shrink-0 snap-start overflow-hidden bg-muted md:w-auto ${single ? "md:col-span-2" : ""}`}
              >
                <Image
                  src={img.url}
                  alt={img.alt}
                  fill
                  priority={i < 2}
                  sizes={
                    single
                      ? "(min-width: 1024px) 60vw, 90vw"
                      : "(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 86vw"
                  }
                  className="object-cover"
                />
                {i === 0 && product.compareAt ? (
                  <span className="absolute top-4 left-4 rounded-[5px] bg-sale px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">
                    −{Math.round(((product.compareAt - product.price) / product.compareAt) * 100)}%
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* Buy box — sticks while the gallery scrolls */}
        <section aria-labelledby="pdp-title" className="flex flex-col gap-4 lg:sticky lg:top-28 short:gap-3">
          <div>
            <h1
              id="pdp-title"
              className="text-2xl leading-tight font-semibold tracking-[0.04em] uppercase short:text-xl"
            >
              {product.name}
            </h1>
          </div>

          <BuyBox
            product={product}
            price={
              <div className="flex flex-wrap items-baseline gap-3">
                {product.compareAt ? (
                  <s className="text-base text-fg-muted">
                    <span className="sr-only">Was </span>
                    {formatPKR(product.compareAt)}
                  </s>
                ) : null}
                <p className={`text-xl font-semibold tracking-[0.02em] ${product.compareAt ? "text-sale" : ""}`}>
                  {product.compareAt ? <span className="sr-only">Now </span> : null}
                  {formatPKR(product.price)}
                </p>
                {product.compareAt ? (
                  <span className="bg-accent px-2 py-0.5 text-xs font-bold text-accent-fg">
                    Save {formatPKR(product.compareAt - product.price)}
                  </span>
                ) : null}
                {product.offer ? (
                  <Link
                    href={`/products?offer=${product.offer.slug}`}
                    className="basis-full text-[13px] font-semibold text-brand hover:underline"
                  >
                    {product.offer.name}
                    {product.offer.endsAt ? ` · ends ${offerEnds.format(new Date(product.offer.endsAt))}` : ""}
                  </Link>
                ) : null}
                {settings.reviewsEnabled && product.rating.count > 0 ? (
                  <a href="#reviews" className="inline-flex items-center gap-1 text-[13px] link-underline">
                    {product.rating.average.toFixed(1)}
                    <Star className="size-3.5 text-saffron" />
                    <span aria-hidden="true">·</span> {product.rating.count} {product.rating.count === 1 ? "review" : "reviews"}
                  </a>
                ) : null}
                <p className="text-xs text-fg-muted">
                  {settings.pricesIncludeTax ? "Inclusive of GST." : "Excludes GST."} Delivery calculated at checkout.
                </p>
              </div>
            }
          />

          <ul className="grid gap-3 border-y border-line py-5 text-sm">
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

          <div>
            <h2 className="mb-2 font-bold">Product description</h2>
            <p className="text-sm leading-relaxed text-fg-muted">{product.description}</p>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
              {product.category ? (
                <>
                  <dt className="font-semibold">Category</dt>
                  <dd className="text-fg-muted">
                    {[product.gender, product.category.name].filter(Boolean).join(" · ")}
                  </dd>
                </>
              ) : null}
              {product.material ? (
                <>
                  <dt className="font-semibold">Material</dt>
                  <dd className="text-fg-muted">{product.material}</dd>
                </>
              ) : null}
              {product.brand ? (
                <>
                  <dt className="font-semibold">Brand</dt>
                  <dd className="text-fg-muted">{product.brand}</dd>
                </>
              ) : null}
            </dl>
            <details className="group mt-4 border-t border-line">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-bold">
                Delivery &amp; returns
                <span aria-hidden="true" className="text-xl transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-4 text-sm text-fg-muted">
                Delivered in 2–4 working days to major cities and 3–6 days elsewhere in Pakistan.
                {settings.returnsEnabled
                  ? ` Unworn pairs can be exchanged or returned within ${settings.returnWindowDays} days.`
                  : ""}
              </p>
              <p className="pb-4 text-sm text-fg-muted">
                <span className="font-semibold text-fg">Tip:</span> record a short unboxing video when your parcel
                arrives. If anything is damaged or wrong, share it with your return request and we&apos;ll sort it out
                quickly.
              </p>
            </details>
            <details className="group border-t border-b border-line">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-bold">
                Care guide
                <span aria-hidden="true" className="text-xl transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-4 text-sm text-fg-muted">
                Wipe clean with a soft, damp cloth. Air dry away from direct heat. Use shoe trees for leather pairs.
              </p>
            </details>
          </div>
        </section>
      </div>

      {/* Reviews */}
      {settings.reviewsEnabled ? (
        <section id="reviews" aria-labelledby="rev-title" className="mt-28 grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-4">
            <h2 id="rev-title" className="heading text-[44px]">
              Reviews
            </h2>
            {product.rating.count > 0 ? (
              <p className="flex items-baseline gap-3">
                <span className="font-display text-6xl">{product.rating.average.toFixed(1)}</span>
                <span className="text-sm text-fg-muted">out of 5 · {product.rating.count} {product.rating.count === 1 ? "review" : "reviews"}</span>
              </p>
            ) : (
              <p className="text-fg-muted">No reviews yet. Bought this pair? Tell others how it fits.</p>
            )}
            <Link href={`/reviews/new?product=${encodeURIComponent(product.slug)}`} className="btn-outline self-start">
              Write a review
            </Link>
          </div>
          <div className="grid gap-4">
            {product.reviews.map((r) => (
              <article key={r.id} className="flex flex-col gap-2.5 card p-7">
                <p role="img" aria-label={`${r.rating} out of 5 stars`} className="flex gap-0.5 text-saffron">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} filled={i < r.rating} className={`size-4 ${i < r.rating ? "" : "text-line"}`} />
                  ))}
                </p>
                {r.title ? <h3 className="font-bold">{r.title}</h3> : null}
                {r.body ? <p className="text-sm text-fg-muted">{r.body}</p> : null}
                <p className="text-[13px]">
                  <strong>{r.user}</strong>
                  {r.isVerifiedPurchase ? (
                    <span className="font-semibold text-success"> · Verified purchase</span>
                  ) : null}
                  {r.fit ? <span className="text-fg-muted"> · {FIT_LABELS[r.fit]}</span> : null}
                </p>
                {r.adminReply ? (
                  <div className="mt-1 rounded-xl bg-muted p-4 text-sm">
                    <p className="text-xs font-bold">Reply from {settings.storeName}</p>
                    <p className="mt-1 whitespace-pre-line text-fg-muted">{r.adminReply}</p>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {related.length ? (
        <section aria-labelledby="rel-title" className="mt-28">
          <h2 id="rel-title" className="mb-9 heading text-[clamp(36px,3.6vw,52px)]">
            You may also like
          </h2>
          <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
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
      <div className="aspect-square bg-muted" />
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
