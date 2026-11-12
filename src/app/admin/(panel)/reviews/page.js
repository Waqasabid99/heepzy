import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Reviews" };

export default withAdmin(function Page() {
  return <PagePlaceholder title="Reviews" description="Moderate and reply to product reviews." />;
});
