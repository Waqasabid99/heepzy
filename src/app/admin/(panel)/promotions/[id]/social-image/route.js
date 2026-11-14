import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isStaff } from "@/lib/roles";
import { scopeSocialData } from "@/lib/admin/scope";
import { formatEnds, PROMO_STYLES, promoAmount } from "@/lib/social";
import { promoImageResponse, readPromoParams } from "@/lib/social-promo-image";

/**
 * GET /admin/promotions/:id/social-image?format=square|story&style=sale|festive|bold&image=0&headline=…
 * Ready-to-post offer image (image=-1 for no photo). Admin only.
 */
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  if (typeof id !== "string" || id.length > 40) return new Response("Not found", { status: 404 });

  const o = await db.promotion.findUnique({
    where: { id },
    include: {
      products: { select: { id: true } },
      categories: { select: { id: true } },
      brands: { select: { id: true } },
    },
  });
  if (!o) return new Response("Not found", { status: 404 });

  const p = readPromoParams(request.nextUrl.searchParams, PROMO_STYLES);
  const social = await scopeSocialData({
    appliesToAll: o.appliesToAll,
    productIds: o.products.map((x) => x.id),
    categoryIds: o.categories.map((x) => x.id),
    brandIds: o.brands.map((x) => x.id),
  });
  const amount = promoAmount({ type: o.type, value: Number(o.value) });

  return promoImageResponse({
    format: p.format,
    theme: PROMO_STYLES[p.style].theme,
    color: p.color,
    pill: "SALE NOW ON",
    headline: p.headline,
    title: o.name,
    amount,
    terms: [
      social.scopeText === "Everything" ? "On everything" : social.scopeText,
      "No code needed",
      o.endsAt ? `Ends ${formatEnds(o.endsAt.toISOString(), true)}` : null,
    ].filter(Boolean),
    photoUrl: p.image >= 0 ? (social.photos[p.image]?.url ?? social.photos[0]?.url) : null,
  });
}
