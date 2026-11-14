import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getStoreSettings } from "@/lib/settings";
import { deliveredPurchase, REVIEW_STATUS_LABELS } from "@/lib/reviews";
import { ReviewForm } from "@/components/store/review-form";
import { Check } from "@/components/ui/icons";

export const metadata = { title: "Write a review", robots: { index: false } };

export default function NewReviewPage({ searchParams }) {
  return (
    <section className="container-page max-w-2xl py-10 lg:py-14" aria-labelledby="rv-title">
      <h1 id="rv-title" className="mb-6 display text-[clamp(36px,5vw,56px)]">
        Write a review
      </h1>
      <Suspense fallback={<p className="text-fg-muted">Loading…</p>}>
        <ReviewPage searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function ReviewPage({ searchParams }) {
  const sp = await searchParams;
  const slug = typeof sp.product === "string" ? sp.product.slice(0, 200) : "";
  const here = `/reviews/new?product=${encodeURIComponent(slug)}`;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(here)}`);

  const product = await db.product.findFirst({
    where: { slug, status: "ACTIVE", deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
    },
  });
  if (!product) notFound();
  const [settings, received, existing] = await Promise.all([
    getStoreSettings(),
    deliveredPurchase(user.id, product.id),
    db.review.findUnique({
      where: { productId_userId: { productId: product.id, userId: user.id } },
      select: { rating: true, fit: true, title: true, body: true, status: true },
    }),
  ]);

  const header = (
    <Link
      href={`/products/${product.slug}`}
      className="mb-8 flex items-center gap-4 rounded-2xl border border-line p-3"
    >
      <span className="relative size-16 shrink-0 overflow-hidden bg-muted">
        {product.images[0] ? (
          <Image src={product.images[0].url} alt="" fill sizes="64px" className="object-cover" />
        ) : null}
      </span>
      <span className="font-bold">{product.name}</span>
    </Link>
  );

  if (sp.sent === "pending" || sp.sent === "live") {
    return (
      <>
        {header}
        <div role="status" className="rounded-tile bg-success-bg p-6 text-success">
          <p className="flex items-center gap-2 text-lg font-extrabold">
            <Check className="size-5" /> Thank you for your review
          </p>
          <p className="mt-1">
            {sp.sent === "pending"
              ? "We'll publish it once we've had a quick look, usually within a day."
              : "It's now on the product page."}
          </p>
        </div>
        <Link href={`/products/${product.slug}#reviews`} className="btn-outline mt-6">
          Back to the product
        </Link>
      </>
    );
  }

  if (!settings.reviewsEnabled || !received) {
    return (
      <>
        {header}
        <div className="rounded-tile bg-muted p-6">
          <p className="font-bold">
            {settings.reviewsEnabled ? "Reviews are from customers who bought this pair" : "Reviews are switched off"}
          </p>
          {settings.reviewsEnabled ? (
            <p className="mt-1 text-fg-muted">
              Once your order with these shoes has been delivered, you can review them here.
            </p>
          ) : null}
          <Link href="/account/orders" className="btn-outline mt-5">
            My orders
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      {existing ? (
        <p className="mb-6 rounded-xl bg-info-bg p-4 text-sm text-info">
          You reviewed these shoes before ({REVIEW_STATUS_LABELS[existing.status].toLowerCase()}). Sending it again
          replaces your review{settings.reviewsRequireApproval ? " and we'll check it again" : ""}.
        </p>
      ) : null}
      <ReviewForm productId={product.id} initial={existing} />
    </>
  );
}
