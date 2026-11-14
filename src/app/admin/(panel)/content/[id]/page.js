import { notFound } from "next/navigation";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { BannerForm } from "@/components/admin/banner-form";
import { getBanner } from "@/lib/admin/banners";

export const metadata = { title: "Edit banner" };

export default withAdmin(async function EditBannerPage({ params }) {
  const { id } = await params;
  const banner = await getBanner(String(id).slice(0, 40));
  if (!banner) notFound();
  return (
    <AdminPage title={banner.name || banner.title} back={{ href: "/admin/content", label: "Banners" }}>
      <BannerForm banner={banner} />
    </AdminPage>
  );
});
