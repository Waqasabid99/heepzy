import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Orders" };

export default withAdmin(function Page() {
  return (
    <PagePlaceholder
      title="Orders"
      description="Confirm, fulfil, ship, cancel and track orders. COD and Paysafe payments."
    />
  );
});
