import { notFound } from "next/navigation";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Notice, StatusBadge } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";
import { getAdminProduct, getProductFormOptions } from "@/lib/admin/products";
import { getStoreSettings } from "@/lib/settings";
import { loadPromotions, priceFor } from "@/lib/pricing";

export const metadata = { title: "Edit product" };

export default withAdmin(async function EditProductPage({ params, searchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [product, options, settings, promos] = await Promise.all([
    getAdminProduct(id),
    getProductFormOptions(),
    getStoreSettings(),
    loadPromotions(),
  ]);
  if (!product) notFound();
  // Live offer price, so social posts match what the store charges.
  const live = priceFor(
    promos.list,
    { id: product.id, brandId: product.brandId || null, categoryIds: product.categoryIds },
    product.basePrice,
    product.compareAtPrice || null,
  );

  return (
    <AdminPage
      title={product.name}
      back={{ href: "/admin/products", label: "Products" }}
      actions={<StatusBadge status={product.status} />}
    >
      {sp.created ? <Notice>Product created. Add more photos or sizes below, then publish when ready.</Notice> : null}
      {sp.saved ? <Notice>Changes saved.</Notice> : null}
      {/* Remount with fresh values after each save. */}
      <ProductForm
        key={product.updatedAt}
        product={product}
        options={options}
        social={{
          siteUrl: (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, ""),
          offer: live.promotion
            ? { name: live.promotion.name, endsAt: live.promotion.endsAt, price: live.price, compareAt: live.compareAt }
            : null,
          settings: {
            codEnabled: settings.codEnabled,
            freeDeliveryEnabled: settings.freeDeliveryEnabled,
            freeDeliveryThreshold: settings.freeDeliveryThreshold,
            returnsEnabled: settings.returnsEnabled,
            returnWindowDays: settings.returnWindowDays,
          },
        }}
      />
    </AdminPage>
  );
});
