import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { OfferForm } from "@/components/admin/offer-form";
import { getScopeOptions } from "@/lib/admin/scope";

export const metadata = { title: "New offer" };

export default withAdmin(async function NewOfferPage() {
  const scopeOptions = await getScopeOptions();
  return (
    <AdminPage title="New offer" back={{ href: "/admin/promotions", label: "Offers" }}>
      <OfferForm offer={null} scopeOptions={scopeOptions} />
    </AdminPage>
  );
});
