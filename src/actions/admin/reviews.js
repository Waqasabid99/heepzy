"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { CATALOG_TAG } from "@/lib/catalog";
import { recomputeRating } from "@/lib/reviews";

/** Admin → Reviews: publish, hide, reply to and delete customer reviews. */

const id = z.string().min(10).max(40);

async function done(adminId, action, review, metadata) {
  await audit({ actorId: adminId, action, entity: "Review", entityId: review.id, metadata });
  updateTag(CATALOG_TAG);
  updateTag("reviews");
  refresh();
}

async function setStatus(reviewId, status, action) {
  const admin = await requireStaff();
  if (!id.safeParse(reviewId).success) return { ok: false, message: "Review not found." };
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { id: true, productId: true, product: { select: { name: true } } },
  });
  if (!review) return { ok: false, message: "Review not found." };
  await db.$transaction(async (tx) => {
    await tx.review.update({ where: { id: review.id }, data: { status } });
    await recomputeRating(review.productId, tx);
  });
  await done(admin.id, action, review, { product: review.product.name });
  return { ok: true, message: status === "APPROVED" ? "Published." : "Hidden from the store." };
}

export async function approveReview(reviewId) {
  return setStatus(reviewId, "APPROVED", "review.approve");
}

export async function rejectReview(reviewId) {
  return setStatus(reviewId, "REJECTED", "review.reject");
}

export async function replyToReview(_prev, formData) {
  const admin = await requireStaff();
  const parsed = z
    .object({ reviewId: id, reply: z.string().trim().max(1000, "Keep the reply under 1,000 characters") })
    .safeParse({ reviewId: String(formData.get("reviewId") ?? ""), reply: String(formData.get("reply") ?? "") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const review = await db.review.findUnique({ where: { id: parsed.data.reviewId }, select: { id: true } });
  if (!review) return { ok: false, message: "Review not found." };
  await db.review.update({ where: { id: review.id }, data: { adminReply: parsed.data.reply || null } });
  await done(admin.id, "review.reply", review, { removed: !parsed.data.reply });
  return { ok: true, message: parsed.data.reply ? "Reply saved." : "Reply removed." };
}

export async function deleteReview(reviewId) {
  const admin = await requireStaff();
  if (!id.safeParse(reviewId).success) return { ok: false, message: "Review not found." };
  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { id: true, productId: true, rating: true, product: { select: { name: true } } },
  });
  if (!review) return { ok: false, message: "Review not found." };
  await db.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: review.id } });
    await recomputeRating(review.productId, tx);
  });
  await done(admin.id, "review.delete", review, { product: review.product.name, rating: review.rating });
  return { ok: true, message: "Review deleted." };
}
