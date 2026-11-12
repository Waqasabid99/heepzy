import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Tax rates" };

export default withAdmin(function Page() {
  return (
    <PagePlaceholder
      title="Tax rates"
      description="GST and province-specific tax rates; prices inclusive or exclusive of tax."
    />
  );
});
