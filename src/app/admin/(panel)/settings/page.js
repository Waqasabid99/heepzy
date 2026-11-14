import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { StoreSettingsForm } from "@/components/admin/settings-forms";
import { getSettingsForAdmin } from "@/lib/admin/settings";

export const metadata = { title: "Settings" };

export default withAdmin(async function StoreSettingsPage() {
  const s = await getSettingsForAdmin();
  return (
    <AdminPage title="Settings" description="How the store looks and works for customers.">
      <SettingsTabs current="/admin/settings" />
      <div className="max-w-4xl">
        <StoreSettingsForm s={s} />
      </div>
    </AdminPage>
  );
});
