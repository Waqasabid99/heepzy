import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Offers" };

export default withAdmin(function Page() {
  return <PagePlaceholder title="Offers" description="Automatic sales on products, categories or brands." />;
});
