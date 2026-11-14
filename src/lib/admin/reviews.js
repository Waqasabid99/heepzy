import "server-only";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";

export const REVIEW_PAGE_SIZE = 20;
export const REVIEW_TABS = ["PENDING", "APPROVED", "REJECTED"];

const one = (v) => (Array.isArray(v) ? v[0] : v);

export function parseReviewParams(sp = {}) {
  const status = one(sp.status);
  return {
    // Default to the queue that needs work.
    status: REVIEW_TABS.includes(status) ? status : status === "all" ? null : "PENDING",
    q: (one(sp.q) ?? "").toString().trim().slice(0, 100),
    rating: ["1", "2", "3", "4", "5"].includes(one(sp.rating)) ? Number(one(sp.rating)) : null,
    page: Math.max(1, Math.min(Number.parseInt(one(sp.page), 10) || 1, 1000)),
  };
}

export async function listReviews({ status, q, rating, page }) {
  await requireStaff();
  const where = {};
  if (status) where.status = status;
  if (rating) where.rating = rating;
  if (q) {
    where.OR = [
      { product: { name: { contains: q } } },
      { user: { name: { contains: q } } },
      { user: { email: { contains: q } } },
      { body: { contains: q } },
    ];
  }
  const [total, rows, grouped] = await Promise.all([
    db.review.count({ where }),
    db.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * REVIEW_PAGE_SIZE,
      take: REVIEW_PAGE_SIZE,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        fit: true,
        status: true,
        adminReply: true,
        isVerifiedPurchase: true,
        createdAt: true,
        updatedAt: true,
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    db.review.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / REVIEW_PAGE_SIZE)),
    counts,
    reviews: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      edited: r.updatedAt.getTime() - r.createdAt.getTime() > 60_000,
      updatedAt: r.updatedAt.toISOString(),
      product: { ...r.product, image: r.product.images[0]?.url ?? null, images: undefined },
    })),
  };
}
