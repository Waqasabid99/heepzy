import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Audit log" };

export default withAdmin(function Page() {
  return <PagePlaceholder title="Audit log" description="Record of every admin change." />;
});
