import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { BannerForm } from "@/components/admin/banner-form";
import { SLOTS } from "@/lib/banner-slots";

export const metadata = { title: "New banner" };

export default withAdmin(async function NewBannerPage({ searchParams }) {
  const sp = await searchParams;
  const slot = Object.hasOwn(SLOTS, sp.slot) ? sp.slot : "HOME_HERO";
  return (
    <AdminPage title="New banner" back={{ href: "/admin/content", label: "Banners" }}>
      <BannerForm slot={slot} />
    </AdminPage>
  );
});
