import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Inventory" };

export default withAdmin(function Page() {
  return <PagePlaceholder title="Inventory" description="Stock per SKU, adjustments and the stock movement ledger." />;
});
