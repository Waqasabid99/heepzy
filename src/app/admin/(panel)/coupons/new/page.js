import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { CouponForm } from "@/components/admin/coupon-form";
import { getScopeOptions } from "@/lib/admin/scope";

export const metadata = { title: "New voucher" };

export default withAdmin(async function NewCouponPage() {
  const scopeOptions = await getScopeOptions();
  return (
    <AdminPage title="New voucher" back={{ href: "/admin/coupons", label: "Vouchers" }}>
      <CouponForm coupon={null} scopeOptions={scopeOptions} />
    </AdminPage>
  );
});
