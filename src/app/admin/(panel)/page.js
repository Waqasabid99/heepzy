import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Dashboard" };

export default withAdmin(function Page() {
  return (
    <PagePlaceholder title="Dashboard" description="Sales, orders, low-stock alerts and pending returns at a glance." />
  );
});
