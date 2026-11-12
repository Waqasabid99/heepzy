import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Payments" };

export default withAdmin(function Page() {
  return (
    <PagePlaceholder title="Payments" description="Enable cash on delivery and card/wallet payments via Paysafe." />
  );
});
