import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Returns & refunds" };

export default withAdmin(function Page() {
  return (
    <PagePlaceholder
      title="Returns & refunds"
      description="Approve or reject return requests, receive items, issue refunds."
    />
  );
});
