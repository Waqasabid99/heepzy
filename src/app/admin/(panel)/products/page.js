import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Products" };

export default withAdmin(function Page() {
  return (
    <PagePlaceholder
      title="Products"
      description="Products, colourways, sizes (variants), images, categories, brands and size charts."
    />
  );
});
