import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Store settings" };

export default withAdmin(function Page() {
  return <PagePlaceholder title="Store settings" description="Store details, checkout options and feature toggles." />;
});
