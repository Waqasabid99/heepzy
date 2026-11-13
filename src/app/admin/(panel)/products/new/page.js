import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { getProductFormOptions } from "@/lib/admin/products";

export const metadata = { title: "Add product" };

export default withAdmin(async function NewProductPage() {
  const options = await getProductFormOptions();
  return (
    <AdminPage title="Add product" back={{ href: "/admin/products", label: "Products" }}>
      <ProductForm product={null} options={options} />
    </AdminPage>
  );
});
