import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { ReturnSettingsForm } from "@/components/admin/settings-forms";
import { getSettingsForAdmin } from "@/lib/admin/settings";

export const metadata = { title: "Returns settings" };

export default withAdmin(async function ReturnSettingsPage() {
  const s = await getSettingsForAdmin();
  return (
    <AdminPage title="Settings" description="How the store looks and works for customers.">
      <SettingsTabs current="/admin/settings/returns" />
      <div className="max-w-4xl">
        <ReturnSettingsForm s={s} />
      </div>
    </AdminPage>
  );
});
