import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PROVINCES } from "@/lib/checkout";
import { MAX_ADDRESSES } from "@/lib/addresses";
import { AddressBook, PasswordForm, ProfileForm, SignOutButton } from "@/components/store/account-forms";

export const metadata = { title: "Account settings", robots: { index: false } };

function Panel({ id, title, description, children }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className="scroll-mt-28 rounded-2xl border border-line bg-surface p-5 sm:p-7"
    >
      <h2 id={`${id}-h`} className="text-xl font-extrabold">
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-fg-muted">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  return (
    <>
      <h1 className="mb-6 display text-[clamp(36px,4vw,52px)]">Settings</h1>
      <Suspense fallback={<p className="text-fg-muted">Loading…</p>}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const user = await requireUser("/login?next=/account/settings");
  const [profile, addresses] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, phone: true } }),
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
  ]);
  return (
    <div className="grid gap-5">
      <Panel
        id="addresses"
        title="Addresses"
        description="The one marked “Used at checkout” is filled in for you when you order."
      >
        <AddressBook addresses={addresses} provinces={PROVINCES} max={MAX_ADDRESSES} />
      </Panel>
      <Panel id="details" title="Your details" description="We call or WhatsApp this number about your orders.">
        <ProfileForm user={profile} />
      </Panel>
      <Panel id="password" title="Password">
        <PasswordForm />
      </Panel>
      <div className="lg:hidden">
        <SignOutButton />
      </div>
    </div>
  );
}
