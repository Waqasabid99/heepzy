import Link from "next/link";
import { notFound } from "next/navigation";
import { withAdmin } from "@/components/admin/with-admin";
import { AdminPage, Notice, StatCard } from "@/components/admin/ui";
import { Plus } from "@/components/ui/icons";
import { OrderStatusBadge, PaymentBadge } from "@/components/admin/order-badges";
import { CustomerActions, RoleActions } from "@/components/admin/customer-actions";
import { isOwner, isStaff, ROLE_LABELS } from "@/lib/roles";
import { getCustomer } from "@/lib/admin/customers";
import { PROVINCES } from "@/lib/checkout";
import { formatPKR } from "@/lib/money";
import { pktDate, pktDateTime } from "@/lib/pkt";

export const metadata = { title: "Customer" };

export default withAdmin(async function CustomerPage({ params, searchParams, admin }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const c = await getCustomer(id);
  if (!c) notFound();
  const wa = c.phone ? c.phone.replace(/\D/g, "").replace(/^0/, "92") : null;

  return (
    <AdminPage
      title={c.name || c.email}
      description={`Customer since ${pktDate.format(new Date(c.createdAt))}${
        c.lastSeenAt ? ` · last signed in ${pktDateTime.format(new Date(c.lastSeenAt))}` : ""
      }`}
      back={{ href: "/admin/customers", label: "Customers" }}
      actions={
        <>
          {c.banned ? (
            <span className="rounded-full bg-danger-bg px-2.5 py-0.5 text-xs font-bold text-sale">Blocked</span>
          ) : null}
          {isStaff(c.role) ? (
            <span className="rounded-full bg-info-bg px-2.5 py-0.5 text-xs font-bold text-info">
              {ROLE_LABELS[c.role]}
            </span>
          ) : null}
          {!c.banned ? (
            <Link href={`/admin/orders/new?customer=${c.id}`} className="btn-primary min-h-11">
              <Plus className="size-4" /> New order
            </Link>
          ) : null}
        </>
      }
    >
      {sp.created ? <Notice>Account created.</Notice> : null}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Orders" value={c.stats.orders} hint="Not counting cancelled" />
        <StatCard label="Total spent" value={formatPKR(c.stats.spent)} />
        <StatCard label="Average order" value={c.stats.average ? formatPKR(c.stats.average) : "—"} />
        <StatCard
          label="Last order"
          value={c.stats.lastOrderAt ? pktDate.format(new Date(c.stats.lastOrderAt)) : "—"}
          hint={c.stats.firstOrderAt ? `First ${pktDate.format(new Date(c.stats.firstOrderAt))}` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-5">
          <section aria-labelledby="ord-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 id="ord-title" className="mb-4 font-extrabold">
              Orders
            </h2>
            {c.orders.length ? (
              <div className="-mx-5 relative overflow-x-auto sm:-mx-6">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b border-line text-xs font-bold tracking-[0.06em] text-fg-muted uppercase">
                    <tr>
                      <th scope="col" className="px-5 py-2 sm:px-6">
                        Order
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Payment
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Status
                      </th>
                      <th scope="col" className="px-5 py-2 text-right sm:px-6">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.orders.map((o) => (
                      <tr key={o.id} className="border-b border-line last:border-0">
                        <td className="px-5 py-2.5 sm:px-6">
                          <Link href={`/admin/orders/${o.id}`} className="font-bold hover:underline">
                            {o.orderNumber}
                          </Link>
                          <span className="block text-xs text-fg-muted">
                            {pktDateTime.format(new Date(o.placedAt))} · {o.pairs} {o.pairs === 1 ? "pair" : "pairs"}
                            {o.guest ? " · as guest" : ""}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <PaymentBadge method={o.paymentMethod} status={o.paymentStatus} />
                        </td>
                        <td className="px-3 py-2.5">
                          <OrderStatusBadge status={o.status} />
                        </td>
                        <td className="px-5 py-2.5 text-right font-bold whitespace-nowrap sm:px-6">
                          {formatPKR(o.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-fg-muted">No orders yet.</p>
            )}
            {c.stats.orders > c.orders.length ? (
              <p className="mt-3 text-[13px] text-fg-muted">Showing the latest {c.orders.length}.</p>
            ) : null}
          </section>

          <section aria-labelledby="addr-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 id="addr-title" className="mb-3 font-extrabold">
              Saved addresses
            </h2>
            {c.addresses.length ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {c.addresses.map((a) => (
                  <li key={a.id} className="rounded-xl bg-muted p-4 text-sm">
                    <p className="mb-1 text-xs font-bold tracking-[0.06em] text-fg-muted uppercase">
                      {a.label || "Address"}
                      {a.isDefault ? " · default" : ""}
                    </p>
                    {a.fullName}
                    <br />
                    {a.line1}
                    {a.line2 ? (
                      <>
                        <br />
                        {a.line2}
                      </>
                    ) : null}
                    <br />
                    {a.city}, {PROVINCES[a.province]}
                    <br />
                    {a.phone}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fg-muted">None saved.</p>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-6 lg:self-start">
          <section aria-labelledby="contact-title" className="rounded-2xl border border-line bg-surface p-5 text-sm">
            <h2 id="contact-title" className="mb-2 font-extrabold">
              Contact
            </h2>
            <p>
              <a href={`mailto:${c.email}`} className="break-all hover:underline">
                {c.email}
              </a>
              <span className="ml-1 text-xs text-fg-muted">{c.emailVerified ? "(verified)" : "(not verified)"}</span>
            </p>
            {c.phone ? (
              <p className="flex flex-wrap gap-x-3">
                <a href={`tel:${c.phone}`} className="hover:underline">
                  {c.phone}
                </a>
                <a
                  href={`https://wa.me/${wa}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-success hover:underline"
                >
                  WhatsApp<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            ) : (
              <p className="text-fg-muted">No phone on the account.</p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-[13px]">
              <dt className="text-fg-muted">Reviews</dt>
              <dd className="text-right font-semibold">{c._count.reviews}</dd>
              <dt className="text-fg-muted">Wishlist</dt>
              <dd className="text-right font-semibold">{c._count.wishlist}</dd>
              <dt className="text-fg-muted">Vouchers used</dt>
              <dd className="text-right font-semibold">{c._count.couponUses}</dd>
              <dt className="text-fg-muted">Return requests</dt>
              <dd className="text-right font-semibold">{c._count.returnRequests}</dd>
              <dt className="text-fg-muted">In bag now</dt>
              <dd className="text-right font-semibold">
                {c.cartPairs} {c.cartPairs === 1 ? "pair" : "pairs"}
              </dd>
            </dl>
          </section>
          {c.id !== admin.id && (c.role === "user" || (c.role === "manager" && isOwner(admin.role))) ? (
            <CustomerActions userId={c.id} banned={Boolean(c.banned)} banReason={c.banReason} />
          ) : null}
          {isOwner(admin.role) && c.id !== admin.id ? <RoleActions userId={c.id} role={c.role} /> : null}
        </aside>
      </div>
    </AdminPage>
  );
});
