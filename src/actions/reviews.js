"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getStoreSettings } from "@/lib/settings";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { CATALOG_TAG } from "@/lib/catalog";
import { deliveredPurchase, recomputeRating } from "@/lib/reviews";

const schema = z.object({
  productId: z.string().min(10).max(40),
  rating: z.coerce.number({ error: "Choose a star rating" }).int().min(1, "Choose a star rating").max(5),
  fit: z.enum(["SMALL", "TRUE", "LARGE"]).nullable(),
  title: z.string().trim().max(150, "Keep the title under 150 characters"),
  body: z
    .string()
    .trim()
    .min(10, "Tell us a little more (at least 10 characters)")
    .max(3000, "Keep it under 3,000 characters"),
});

/** Customer: write or edit their review of a product they've received. */
export async function submitReview(_prev, formData) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in to write a review." };
  const rl = await rateLimit("review", { ...LIMITS.review, key: user.id });
  if (!rl.ok) return { ok: false, message: "You've sent a few reviews already. Please try again later." };

  const parsed = schema.safeParse({
    productId: String(formData.get("productId") ?? ""),
    rating: formData.get("rating") ?? undefined,
    fit: formData.get("fit") || null,
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if (!parsed.success) {
    const errors = {};
    for (const i of parsed.error.issues) errors[i.path[0] ?? "form"] ??= i.message;
    return { ok: false, errors };
  }
  const f = parsed.data;

  const settings = await getStoreSettings();
  if (!settings.reviewsEnabled) return { ok: false, message: "Reviews are switched off right now." };
  const product = await db.product.findFirst({
    where: { id: f.productId, status: "ACTIVE", deletedAt: null },
    select: { id: true, slug: true },
  });
  if (!product) return { ok: false, message: "We couldn't find this product." };
  if (!(await deliveredPurchase(user.id, product.id))) {
    return { ok: false, message: "You can review shoes once your order has been delivered." };
  }

  const status = settings.reviewsRequireApproval ? "PENDING" : "APPROVED";
  const data = {
    rating: f.rating,
    fit: f.fit,
    title: f.title || null,
    body: f.body,
    isVerifiedPurchase: true,
    status,
  };
  await db.$transaction(async (tx) => {
    await tx.review.upsert({
      where: { productId_userId: { productId: product.id, userId: user.id } },
      create: { productId: product.id, userId: user.id, ...data },
      // An edited review is checked again; the store's earlier reply no longer fits it.
      update: { ...data, adminReply: null },
    });
    await recomputeRating(product.id, tx);
  });
  updateTag(CATALOG_TAG);
  updateTag("reviews");
  redirect(
    `/reviews/new?product=${encodeURIComponent(product.slug)}&sent=${status === "PENDING" ? "pending" : "live"}`,
  );
}
