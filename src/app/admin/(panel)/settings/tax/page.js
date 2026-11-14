import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { TaxModeForm } from "@/components/admin/settings-forms";
import { TaxRates } from "@/components/admin/tax-rates";
import { getSettingsForAdmin, getTaxRates } from "@/lib/admin/settings";
import { PROVINCES } from "@/lib/checkout";

export const metadata = { title: "Tax settings" };

export default withAdmin(async function TaxSettingsPage() {
  const [s, rates] = await Promise.all([getSettingsForAdmin(), getTaxRates()]);
  return (
    <AdminPage title="Settings" description="How the store looks and works for customers.">
      <SettingsTabs current="/admin/settings/tax" />
      <div className="grid max-w-5xl gap-5">
        <TaxModeForm s={s} />
        <TaxRates rates={rates} provinces={PROVINCES} />
      </div>
    </AdminPage>
  );
});
