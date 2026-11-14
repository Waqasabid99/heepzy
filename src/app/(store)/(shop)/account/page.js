import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSession, requireUser } from "@/lib/session";
import { isStaff } from "@/lib/roles";
import { PROVINCES } from "@/lib/checkout";
import { MAX_ADDRESSES } from "@/lib/addresses";
import { AddressBook, PasswordForm, ProfileForm, SignOutButton } from "@/components/store/account-forms";
import { ArrowRight, Exchange, Receipt, Settings } from "@/components/ui/icons";

export const metadata = { title: "My account", robots: { index: false } };

export default function AccountPage() {
  return (
    <section className="container-page max-w-4xl py-10 lg:py-14" aria-labelledby="acct-title">
      <Suspense fallback={<p className="text-fg-muted">Loading your account…</p>}>
        <Account />
      </Suspense>
    </section>
  );
}

function Panel({ id, title, description, children }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <h2 id={id} className="text-xl font-extrabold">
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-fg-muted">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

async function Account() {
  const user = await requireUser("/login?next=/account");
  const [session, profile, addresses, orderCount, openReturns] = await Promise.all([
    getSession(),
    db.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, phone: true, createdAt: true } }),
    db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        label: true,
        fullName: true,
        phone: true,
        line1: true,
        line2: true,
        city: true,
        province: true,
        postalCode: true,
        isDefault: true,
      },
    }),
    db.order.count({ where: { userId: user.id } }),
    db.returnRequest.count({ where: { userId: user.id, status: { in: ["REQUESTED", "APPROVED", "RECEIVED"] } } }),
  ]);
  const firstName = profile.name?.split(" ")[0];
  const memberSince = new Intl.DateTimeFormat("en-PK", { month: "long", year: "numeric", timeZone: "Asia/Karachi" });

  const links = [
    {
      href: "/account/orders",
      Icon: Receipt,
      title: "My orders",
      text: orderCount ? `${orderCount} ${orderCount === 1 ? "order" : "orders"}` : "Nothing yet",
    },
    {
      href: "/account/returns",
      Icon: Exchange,
      title: "Returns & exchanges",
      text: openReturns ? `${openReturns} in progress` : "Swap a size or return",
    },
    ...(isStaff(session?.user?.role)
      ? [{ href: "/admin", Icon: Settings, title: "Store admin", text: "Orders, products, settings" }]
      : []),
  ];

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="acct-title" className="display text-[clamp(40px,5vw,64px)]">
            {firstName ? `Hi, ${firstName}` : "My account"}
          </h1>
          <p className="mt-2 text-fg-muted">Member since {memberSince.format(profile.createdAt)}</p>
        </div>
        <SignOutButton />
      </div>

      <ul className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ href, Icon, title, text }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex h-full items-center gap-4 rounded-2xl border border-line bg-surface p-5 hover:border-fg"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-muted">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{title}</span>
                <span className="block text-sm text-fg-muted">{text}</span>
              </span>
              <ArrowRight className="size-4 text-fg-muted" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-5">
        <Panel id="addr-h" title="Addresses" description="Your default address is filled in for you at checkout.">
          <AddressBook addresses={addresses} provinces={PROVINCES} max={MAX_ADDRESSES} />
        </Panel>
        <Panel id="prof-h" title="Your details" description="We call or WhatsApp this number about your orders.">
          <ProfileForm user={profile} />
        </Panel>
        <Panel id="pw-h" title="Password">
          <PasswordForm />
        </Panel>
      </div>
    </>
  );
}
