import { notFound } from "next/navigation";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Notice } from "@/components/admin/ui";
import { StateBadge } from "@/components/admin/state-badge";
import { OfferForm } from "@/components/admin/offer-form";
import { getOffer } from "@/lib/admin/promotions";
import { getScopeOptions, promoSocialProps } from "@/lib/admin/scope";

export const metadata = { title: "Edit offer" };

export default withAdmin(async function EditOfferPage({ params, searchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [offer, scopeOptions] = await Promise.all([getOffer(id), getScopeOptions()]);
  if (!offer) notFound();
  const social = await promoSocialProps({
    appliesToAll: offer.appliesToAll,
    productIds: offer.productIds,
    categoryIds: offer.categoryIds,
    brandIds: offer.brandIds,
  });

  return (
    <AdminPage
      title={offer.name}
      description={offer.discount}
      back={{ href: "/admin/promotions", label: "Offers" }}
      actions={<StateBadge state={offer.state} />}
    >
      {sp.created ? <Notice>Offer created. Store prices are updated.</Notice> : null}
      {sp.saved ? <Notice>Changes saved. Store prices are updated.</Notice> : null}
      <OfferForm key={offer.updatedAt} offer={offer} scopeOptions={scopeOptions} social={social} />
    </AdminPage>
  );
});
