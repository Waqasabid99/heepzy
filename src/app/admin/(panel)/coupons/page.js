import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Vouchers" };

export default withAdmin(function Page() {
  return (
    <PagePlaceholder
      title="Vouchers"
      description="Discount codes: percentage, fixed amount or free delivery, with limits."
    />
  );
});
