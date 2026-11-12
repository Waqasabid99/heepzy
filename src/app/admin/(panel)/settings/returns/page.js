import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Returns policy" };

export default withAdmin(function Page() {
  return (
    <PagePlaceholder
      title="Returns policy"
      description="Turn returns and refunds on or off, and set the return window."
    />
  );
});
