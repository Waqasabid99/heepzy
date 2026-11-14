import { Suspense } from "react";
import Link from "next/link";
import { getCart } from "@/lib/cart";
import { getStoreSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { PROVINCES } from "@/lib/checkout";
import { getSafepayStatus } from "@/lib/payments/safepay";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <section className="container-page py-8 lg:py-12" aria-labelledby="checkout-title">
      <h1 id="checkout-title" className="mb-8 display text-[clamp(40px,5vw,64px)]">
        Checkout
      </h1>
      <Suspense fallback={<p className="text-fg-muted">Loading your bag…</p>}>
        <Checkout />
      </Suspense>
    </section>
  );
}

async function Checkout() {
  const [cart, settings, user] = await Promise.all([getCart(), getStoreSettings(), getCurrentUser()]);
  const lines = cart.lines.filter((l) => l.available);

  if (!lines.length) {
    return (
      <div className="rounded-tile bg-muted px-6 py-16 text-center">
        <p className="heading text-3xl">Your bag is empty.</p>
        <Link href="/products" className="btn-primary mt-6">
          Continue shopping
        </Link>
      </div>
    );
  }
  if (!user && !settings.guestCheckoutEnabled) {
    return (
      <div className="rounded-tile bg-muted px-6 py-16 text-center">
        <p className="heading text-3xl">Please sign in to check out.</p>
        <Link href="/login?next=/checkout" className="btn-primary mt-6">
          Sign in
        </Link>
      </div>
    );
  }

  const safepay = await getSafepayStatus();
  const address = user
    ? await db.address.findFirst({
        where: { userId: user.id },
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        select: { fullName: true, phone: true, line1: true, line2: true, city: true, province: true, postalCode: true },
      })
    : null;

  return (
    <CheckoutForm
      lines={lines.map((l) => ({
        id: l.id,
        name: l.name,
        color: l.color,
        size: l.size,
        quantity: l.quantity,
        lineTotal: l.lineTotal,
        image: l.image?.url ?? null,
      }))}
      unavailable={cart.lines.length - lines.length}
      provinces={PROVINCES}
      payment={{
        cod: settings.codEnabled,
        card: settings.cardPaymentsEnabled && safepay.configured,
        sandbox: safepay.environment !== "production",
      }}
      initial={{
        email: user?.email ?? "",
        phone: address?.phone ?? "",
        fullName: address?.fullName ?? user?.name ?? "",
        line1: address?.line1 ?? "",
        line2: address?.line2 ?? "",
        city: address?.city ?? "",
        province: address?.province ?? "",
        postalCode: address?.postalCode ?? "",
      }}
      signedIn={Boolean(user)}
      returnDays={settings.returnsEnabled ? settings.returnWindowDays : null}
    />
  );
}
