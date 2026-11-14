import Link from "next/link";
import { notFound } from "next/navigation";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Notice, StatCard } from "@/components/admin/ui";
import { StateBadge } from "@/components/admin/state-badge";
import { OrderStatusBadge } from "@/components/admin/order-badges";
import { CouponForm } from "@/components/admin/coupon-form";
import { getCoupon } from "@/lib/admin/coupons";
import { getScopeOptions, promoSocialProps } from "@/lib/admin/scope";
import { formatPKR } from "@/lib/money";
import { pktDateTime } from "@/lib/pkt";

export const metadata = { title: "Edit voucher" };

export default withAdmin(async function EditCouponPage({ params, searchParams }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [coupon, scopeOptions] = await Promise.all([getCoupon(id), getScopeOptions()]);
  if (!coupon) notFound();
  const social = await promoSocialProps({
    appliesToAll: coupon.appliesToAll,
    productIds: coupon.productIds,
    categoryIds: coupon.categoryIds,
    brandIds: coupon.brandIds,
  });

  return (
    <AdminPage
      title={coupon.code}
      description={coupon.discount}
      back={{ href: "/admin/coupons", label: "Vouchers" }}
      actions={<StateBadge state={coupon.state} />}
    >
      {sp.created ? <Notice>Voucher created. Customers can use it at checkout while it&apos;s active.</Notice> : null}
      {sp.saved ? <Notice>Changes saved.</Notice> : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Times used"
          value={coupon.redeemed}
          hint={coupon.usageLimit ? `of ${coupon.usageLimit} allowed` : "No total limit"}
        />
        <StatCard label="Discount given" value={formatPKR(coupon.given)} />
        <StatCard
          label="Average saving"
          value={coupon.redeemed ? formatPKR(Math.round(coupon.given / coupon.redeemed)) : "—"}
        />
      </div>

      <CouponForm key={coupon.updatedAt} coupon={coupon} scopeOptions={scopeOptions} social={social} />

      <section aria-labelledby="red-title" className="mt-5 rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <h2 id="red-title" className="mb-3 font-extrabold">
          Recent uses
        </h2>
        {coupon.redemptions.length ? (
          <ul className="grid gap-2 text-sm">
            {coupon.redemptions.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2"
              >
                <span>
                  <Link href={`/admin/orders/${r.order.id}`} className="font-bold hover:underline">
                    {r.order.orderNumber}
                  </Link>{" "}
                  <span className="text-fg-muted">
                    · {r.email} · {pktDateTime.format(new Date(r.createdAt))}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <OrderStatusBadge status={r.order.status} />
                  <span className="font-bold">− {formatPKR(r.amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">Not used yet.</p>
        )}
      </section>
    </AdminPage>
  );
});
