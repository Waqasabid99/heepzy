import { PagePlaceholder } from "@/components/ui/page-placeholder";
import { withAdmin } from "@/components/admin/with-admin";

export const metadata = { title: "Banners" };

export default withAdmin(function Page() {
  return <PagePlaceholder title="Banners" description="Homepage and promotional banners." />;
});
