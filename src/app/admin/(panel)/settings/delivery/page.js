import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Delivery" };

export default withAdmin(function Page() {
  return (
    <PagePlaceholder
      title="Delivery"
      description="Delivery zones (cities / provinces), rates, COD fees and free-delivery thresholds."
    />
  );
});
