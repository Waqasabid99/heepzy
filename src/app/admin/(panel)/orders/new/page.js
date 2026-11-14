import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { AdminOrderForm } from "@/components/admin/admin-order-form";
import { getCustomerForOrder } from "@/lib/admin/order-create";
import { PROVINCES } from "@/lib/checkout";
import { getStoreSettings } from "@/lib/settings";
import { safepayConfigured } from "@/lib/payments/safepay";

export const metadata = { title: "New order" };

export default withAdmin(async function NewOrderPage({ searchParams }) {
  const sp = await searchParams;
  const [customer, settings] = await Promise.all([
    typeof sp.customer === "string" ? getCustomerForOrder(sp.customer) : null,
    getStoreSettings(),
  ]);
  return (
    <AdminPage
      title="New order"
      description="For orders taken by phone, WhatsApp or in person. Uses the same prices, offers, vouchers and stock as the store."
      back={{ href: "/admin/orders", label: "Orders" }}
    >
      <AdminOrderForm
        provinces={PROVINCES}
        initialCustomer={customer}
        cardAvailable={Boolean(settings.cardPaymentsEnabled && safepayConfigured())}
      />
    </AdminPage>
  );
});
