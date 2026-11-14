import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { isStaff } from "@/lib/roles";
import { PROVINCES } from "@/lib/checkout";
import { formatPKR } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { ORDER_STATUS_LABELS } from "@/lib/orders";
import { SignOutButton } from "@/components/store/account-forms";
import { ArrowRight, Grid } from "@/components/ui/icons";

export const metadata = { title: "My account", robots: { index: false } };

const dateFmt = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });
const since = new Intl.DateTimeFormat("en-PK", { month: "long", year: "numeric", timeZone: "Asia/Karachi" });

export default function AccountPage() {
  return (
    <Suspense fallback={<p className="text-fg-muted">Loading your account…</p>}>
      <Overview />
    </Suspense>
  );
}

function Card({ title, href, linkText, children }) {
  return (
    <section className="flex flex-col rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-extrabold">{title}</h2>
        {href ? (
          <Link href={href} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold hover:underline">
            {linkText} <ArrowRight className="size-4" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

async function Overview() {
  const user = await requireUser("/login?next=/account");
  const [profile, orders, address, openReturns] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { name: true, createdAt: true } }),
    db.order.findMany({
      where: { userId: user.id },
      orderBy: { placedAt: "desc" },
      take: 3,
      select: {
        orderNumber: true,
        placedAt: true,
        status: true,
        grandTotal: true,
        items: { select: { quantity: true } },
      },
    }),
    db.address.findFirst({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] }),
    db.returnRequest.count({ where: { userId: user.id, status: { in: ["REQUESTED", "APPROVED", "RECEIVED"] } } }),
  ]);
  const first = profile.name?.split(" ")[0];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[clamp(36px,4vw,52px)]">{first ? `Hi, ${first}` : "My account"}</h1>
          <p className="mt-2 text-fg-muted">Member since {since.format(profile.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isStaff(user.role) ? (
            <Link href="/admin" className="btn-ink min-h-11">
              <Grid className="size-4" /> Admin dashboard
            </Link>
          ) : null}
          <span className="lg:hidden">
            <SignOutButton />
          </span>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="xl:col-span-2">
          <Card title="Recent orders" href="/account/orders" linkText="All orders">
            {orders.length ? (
              <ul className="divide-y divide-line">
                {orders.map((o) => {
                  const pairs = o.items.reduce((n, i) => n + i.quantity, 0);
                  return (
                    <li key={o.orderNumber}>
                      <Link
                        href={`/checkout/complete/${o.orderNumber}`}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 hover:underline-offset-2"
                      >
                        <span>
                          <span className="block font-bold">{o.orderNumber}</span>
                          <span className="block text-sm text-fg-muted">
                            {dateFmt.format(o.placedAt)} · {pairs} {pairs === 1 ? "pair" : "pairs"}
                          </span>
                        </span>
                        <span className="text-right text-sm">
                          <span className="block font-bold">{formatPKR(Number(o.grandTotal))}</span>
                          <span className="block text-fg-muted">{ORDER_STATUS_LABELS[o.status]}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-fg-muted">
                No orders yet.{" "}
                <Link href="/products" className="font-semibold text-fg underline">
                  Start shopping
                </Link>
              </p>
            )}
          </Card>
        </div>

        <Card title="Delivery address" href="/account/settings#addresses" linkText={address ? "Manage" : "Add"}>
          {address ? (
            <address className="text-sm text-fg-muted not-italic">
              <span className="font-semibold text-fg">{address.fullName}</span> · {formatPhone(address.phone)}
              <br />
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
              <br />
              {address.city}, {PROVINCES[address.province]}
            </address>
          ) : (
            <p className="text-sm text-fg-muted">Save an address to check out faster.</p>
          )}
        </Card>

        <Card title="Returns & exchanges" href="/account/returns" linkText="Open">
          <p className="text-sm text-fg-muted">
            {openReturns
              ? `${openReturns} ${openReturns === 1 ? "request is" : "requests are"} in progress.`
              : "Wrong size? Swap it or send it back from here."}
          </p>
        </Card>
      </div>
    </>
  );
}
