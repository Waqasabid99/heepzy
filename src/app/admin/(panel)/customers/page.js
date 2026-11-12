import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Customers" };

export default withAdmin(function Page() {
  return <PagePlaceholder title="Customers" description="Customer accounts, order history, bans." />;
});
