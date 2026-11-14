import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isStaff } from "@/lib/roles";
import { scopeSocialData } from "@/lib/admin/scope";
import { PROMO_STYLES, promoAmount, voucherTerms } from "@/lib/social";
import { promoImageResponse, readPromoParams } from "@/lib/social-promo-image";

/**
 * GET /admin/coupons/:id/social-image?format=square|story&style=sale|festive|bold&image=0&headline=…
 * Ready-to-post voucher image (image=-1 for no photo). Admin only.
 */
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  if (typeof id !== "string" || id.length > 40) return new Response("Not found", { status: 404 });

  const c = await db.coupon.findUnique({
    where: { id },
    include: {
      products: { select: { id: true } },
      categories: { select: { id: true } },
      brands: { select: { id: true } },
    },
  });
  if (!c) return new Response("Not found", { status: 404 });

  const p = readPromoParams(request.nextUrl.searchParams, PROMO_STYLES);
  const social = await scopeSocialData({
    appliesToAll: c.appliesToAll,
    productIds: c.products.map((x) => x.id),
    categoryIds: c.categories.map((x) => x.id),
    brandIds: c.brands.map((x) => x.id),
  });
  const voucher = {
    type: c.type,
    value: Number(c.value),
    maxDiscountAmount: c.maxDiscountAmount ? Number(c.maxDiscountAmount) : null,
    minOrderAmount: c.minOrderAmount ? Number(c.minOrderAmount) : null,
    firstOrderOnly: c.firstOrderOnly,
    endsAt: c.endsAt?.toISOString() ?? null,
    scopeText: social.scopeText,
  };

  return promoImageResponse({
    format: p.format,
    theme: PROMO_STYLES[p.style].theme,
    color: p.color,
    pill: "VOUCHER",
    headline: p.headline,
    amount: promoAmount(voucher),
    code: c.code,
    terms: voucherTerms(voucher, { short: true }).slice(0, 3),
    photoUrl: p.image >= 0 ? (social.photos[p.image]?.url ?? social.photos[0]?.url) : null,
  });
}
