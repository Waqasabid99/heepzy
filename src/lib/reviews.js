import "server-only";
import { db } from "@/lib/db";

/**
 * Product reviews. Only customers who received the shoes can review them
 * (one review per product per customer; sending it again edits it).
 */
export { FIT_LABELS, REVIEW_STATUS_LABELS } from "@/lib/review-labels";

/** Has this customer received this product? Returns the delivery date or null. */
export async function deliveredPurchase(userId, productId) {
  const item = await db.orderItem.findFirst({
    where: { productId, order: { userId, status: { in: ["DELIVERED", "RETURNED"] } } },
    orderBy: { order: { deliveredAt: "desc" } },
    select: { order: { select: { deliveredAt: true, placedAt: true } } },
  });
  return item ? (item.order.deliveredAt ?? item.order.placedAt) : null;
}

/** Keep the product's stored average and count in step with its published reviews. */
export async function recomputeRating(productId, tx = db) {
  const agg = await tx.review.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await tx.product.update({
    where: { id: productId },
    data: {
      ratingAverage: (agg._avg.rating ?? 0).toFixed(2),
      ratingCount: agg._count._all,
    },
  });
}
