import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { SettingsTabs } from "@/components/admin/settings-tabs";
import { FreeDeliveryForm } from "@/components/admin/settings-forms";
import { DeliveryZones } from "@/components/admin/delivery-zones";
import { getDeliveryZones, getSettingsForAdmin } from "@/lib/admin/settings";
import { PROVINCES } from "@/lib/checkout";

export const metadata = { title: "Delivery settings" };

export default withAdmin(async function DeliverySettingsPage() {
  const [s, zones] = await Promise.all([getSettingsForAdmin(), getDeliveryZones()]);
  return (
    <AdminPage title="Settings" description="How the store looks and works for customers.">
      <SettingsTabs current="/admin/settings/delivery" />
      <div className="grid max-w-5xl gap-5">
        <FreeDeliveryForm s={s} />
        <DeliveryZones zones={zones} provinces={PROVINCES} />
      </div>
    </AdminPage>
  );
});
