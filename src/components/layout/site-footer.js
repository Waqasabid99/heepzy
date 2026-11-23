import Link from "next/link";
import { getStoreSettings } from "@/lib/settings";
import { NewsletterForm } from "./newsletter-form";
import { DrawerItem, FooterDrawer } from "@/components/motion/footer-drawer";
import {
  Banknote,
  CreditCard,
  Facebook,
  Instagram,
  MapPin,
  Phone,
  TikTok,
  Wallet,
  WhatsApp,
} from "@/components/ui/icons";
import { Wordmark } from "@/components/brand/wordmark";
import { BRAND } from "@/lib/brand";
import { waNumber } from "@/lib/whatsapp";

// Developer credit: opens a WhatsApp chat with a short intro typed in.
const DEVELOPER_WHATSAPP = `https://wa.me/923208703508?text=${encodeURIComponent(
  "Hi Waqas, I saw your work on the Mr. Shoes website and would like to discuss a project.",
)}`;

const COLUMNS = [
  {
    title: "Shop",
    links: [
      ["New in", "/products?sort=newest"],
      ["Women", "/products?gender=women"],
      ["Men", "/products?gender=men"],
      ["Khussa & chappals", "/products?category=khussa"],
      ["Sale", "/offers"],
    ],
  },
  {
    title: "Help",
    links: [
      ["Track your order", "/account/orders"],
      ["Size guide", "/size-guide"],
      ["Returns & exchange", "/account/returns"],
      ["Your account", "/account"],
    ],
  },
];

/** Black full-width footer. Slides up as it scrolls into view (FooterDrawer). */
export async function SiteFooter() {
  const s = await getStoreSettings();
  // WhatsApp checkout replaces the payment options, so don't advertise them.
  const viaWhatsApp = s.whatsappCheckout && Boolean(waNumber(s.whatsappNumber));
  const pay = viaWhatsApp
    ? [{ Icon: WhatsApp, label: "Order on WhatsApp" }]
    : [
        s.codEnabled ? { Icon: Banknote, label: "Cash on delivery" } : null,
        s.cardPaymentsEnabled ? { Icon: CreditCard, label: "Visa · Mastercard" } : null,
        s.cardPaymentsEnabled ? { Icon: Wallet, label: "Digital wallets" } : null,
      ].filter(Boolean);

  const socials = [
    s.facebookUrl ? { href: s.facebookUrl, label: "Facebook", Icon: Facebook } : null,
    s.instagramUrl ? { href: s.instagramUrl, label: "Instagram", Icon: Instagram } : null,
    s.tiktokUrl ? { href: s.tiktokUrl, label: "TikTok", Icon: TikTok } : null,
  ].filter(Boolean);

  return (
    <footer className="mt-auto overflow-hidden bg-bg">
      <FooterDrawer className="bg-panel text-on-panel">
        <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1.5fr] lg:py-16">
          <DrawerItem from={0.1} to={0.7} distance={60}>
            <p>
              <Wordmark className="text-[40px]" />
              <span className="sr-only">{s.storeName || BRAND.name}</span>
            </p>
            <p className="mt-3 text-sm font-bold">{s.tagline || BRAND.tagline}</p>
            <p className="mt-1.5 max-w-xs text-sm text-on-panel-muted">{BRAND.description}</p>
            {s.storeAddress || s.supportPhone || s.supportEmail ? (
              <ul className="mt-5 grid gap-1.5 text-sm">
                {s.storeAddress ? (
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0" />
                    {s.storeAddress}
                  </li>
                ) : null}
                {s.supportPhone ? (
                  <li>
                    <a
                      href={`tel:${s.supportPhone.replace(/[^\d+]/g, "")}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <Phone className="size-4 shrink-0" />
                      {s.supportPhone}
                    </a>
                  </li>
                ) : null}
                {s.supportEmail ? (
                  <li>
                    <a href={`mailto:${s.supportEmail}`} className="hover:underline">
                      {s.supportEmail}
                    </a>
                  </li>
                ) : null}
              </ul>
            ) : null}
            {socials.length ? (
              <ul aria-label="Follow us" className="mt-5 flex gap-2">
                {socials.map(({ href, label, Icon }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${label} (opens in a new tab)`}
                      className="grid size-11 place-items-center rounded-full border border-panel-line hover:bg-on-panel hover:text-panel"
                    >
                      <Icon className="size-5" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </DrawerItem>
          {COLUMNS.map((col, i) => (
            <DrawerItem as="nav" key={col.title} aria-label={col.title} from={0.15 + i * 0.05} to={0.75} distance={60}>
              <p className="mb-3 text-sm font-extrabold tracking-[0.08em] uppercase">{col.title}</p>
              <ul className="grid gap-1 text-sm text-on-panel-muted">
                {col.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="inline-flex min-h-8 items-center hover:text-on-panel hover:underline">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </DrawerItem>
          ))}
          <DrawerItem id="newsletter" from={0.25} to={0.85} distance={60} className="scroll-mt-28">
            <p className="mb-1 text-sm font-extrabold tracking-[0.08em] uppercase">Get sale alerts first</p>
            <NewsletterForm />
          </DrawerItem>
        </div>
        <div className="border-t border-panel-line">
          <div className="container-page flex flex-wrap items-center justify-between gap-4 py-5 pr-20 text-xs font-semibold text-on-panel-muted">
            {pay.length ? (
              <ul aria-label="We accept" className="flex flex-wrap gap-x-5 gap-y-2">
                {pay.map(({ Icon, label }) => (
                  <li key={label} className="flex items-center gap-1.5">
                    <Icon className="size-4" />
                    {label}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <p>© 2026 {s.storeName || BRAND.name}. All prices in PKR.</p>
              <p>
                Developed by{" "}
                <a
                  href={DEVELOPER_WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-8 items-center gap-1 text-on-panel underline-offset-4 hover:underline"
                >
                  Waqas Ali Abid
                  <WhatsApp className="size-3.5" />
                  <span className="sr-only">(message on WhatsApp, opens in a new tab)</span>
                </a>
              </p>
            </div>
          </div>
        </div>
      </FooterDrawer>
    </footer>
  );
}
