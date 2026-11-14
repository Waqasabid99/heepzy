"use client";

import { SocialPostDialog } from "@/components/admin/social-post";
import { buildOfferCaption, buildVoucherCaption, PROMO_STYLES } from "@/lib/social";

/**
 * Social posts for vouchers and offers. `social` = { siteUrl, settings, scopeText, categorySlugs, photos }
 * comes from the server page; captions use the saved voucher / offer.
 */
export function VoucherSocialPost({ coupon, social, dirty }) {
  const voucher = {
    code: coupon.code,
    type: coupon.type,
    value: Number(coupon.value),
    maxDiscountAmount: coupon.maxDiscountAmount ? Number(coupon.maxDiscountAmount) : null,
    minOrderAmount: coupon.minOrderAmount ? Number(coupon.minOrderAmount) : null,
    endsAt: coupon.endsAt,
    firstOrderOnly: coupon.firstOrderOnly,
    usageLimit: coupon.usageLimit,
    description: coupon.description,
    scopeText: social.scopeText,
    categorySlugs: social.categorySlugs,
  };
  const url =
    social.categorySlugs.length === 1 && !coupon.productIds.length && !coupon.brandIds.length
      ? `${social.siteUrl}/products?category=${social.categorySlugs[0]}`
      : `${social.siteUrl}/products`;
  return (
    <SocialPostDialog
      title="Voucher post"
      subtitle={`For Instagram and Facebook. Uses the saved voucher${dirty ? " (save your changes first)" : ""}.`}
      styles={PROMO_STYLES}
      defaultStyle="sale"
      photos={social.photos}
      allowNoPhoto
      imageSrc={(q) => `/admin/coupons/${coupon.id}/social-image?${q}`}
      caption={({ style, platform }) =>
        buildVoucherCaption({ voucher, settings: social.settings, style, platform, url })
      }
      shareUrl={url}
      fileBase={`voucher-${coupon.code.toLowerCase()}`}
      previewName={`voucher ${coupon.code}`}
      styleHint={() =>
        coupon.state === "off" || coupon.state === "ended"
          ? "This voucher isn't usable right now. Switch it on before posting."
          : null
      }
    />
  );
}

export function OfferSocialPost({ offer, social }) {
  const data = {
    name: offer.name,
    type: offer.type,
    value: Number(offer.value),
    description: offer.description,
    endsAt: offer.endsAt,
    scopeText: social.scopeText,
    categorySlugs: social.categorySlugs,
  };
  const url = `${social.siteUrl}/products?offer=${offer.slug}`;
  return (
    <SocialPostDialog
      title="Offer post"
      subtitle="For Instagram and Facebook. Uses the saved offer."
      styles={PROMO_STYLES}
      defaultStyle="sale"
      photos={social.photos}
      allowNoPhoto
      imageSrc={(q) => `/admin/promotions/${offer.id}/social-image?${q}`}
      caption={({ style, platform }) =>
        buildOfferCaption({ offer: data, settings: social.settings, style, platform, url })
      }
      shareUrl={url}
      fileBase={`offer-${offer.slug}`}
      previewName={offer.name}
      styleHint={() =>
        offer.state === "off" || offer.state === "ended"
          ? "This offer isn't running. Switch it on before posting."
          : offer.state === "scheduled"
            ? "This offer hasn't started yet. The link shows the sale once it starts."
            : null
      }
    />
  );
}
