import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { CustomerForm } from "@/components/admin/customer-form";
import { PROVINCES } from "@/lib/checkout";
import { isOwner } from "@/lib/roles";

export const metadata = { title: "New customer" };

export default withAdmin(function NewCustomerPage({ admin }) {
  return (
    <AdminPage
      title="New customer"
      description="Create an account for someone who orders by phone, WhatsApp or in person, or (as the owner) add a staff member."
      back={{ href: "/admin/customers", label: "Customers" }}
    >
      <CustomerForm provinces={PROVINCES} canCreateStaff={isOwner(admin.role)} />
    </AdminPage>
  );
});
