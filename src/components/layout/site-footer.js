import Link from "next/link";
import { getStoreSettings } from "@/lib/settings";
import { NewsletterForm } from "./newsletter-form";
import { DrawerItem, FooterDrawer } from "@/components/motion/footer-drawer";
import { Banknote, CreditCard, Wallet } from "@/components/ui/icons";

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
  const pay = [
    s.codEnabled ? { Icon: Banknote, label: "Cash on delivery" } : null,
    s.cardPaymentsEnabled ? { Icon: CreditCard, label: "Visa · Mastercard" } : null,
    s.cardPaymentsEnabled ? { Icon: Wallet, label: "Digital wallets" } : null,
  ].filter(Boolean);

  return (
    <footer className="mt-auto overflow-hidden bg-bg">
      <FooterDrawer className="bg-panel text-on-panel">
        <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_0.8fr_1.5fr] lg:py-16">
          <DrawerItem from={0.1} to={0.7} distance={60}>
            <p className="font-display text-[44px] leading-none font-semibold tracking-[0.03em] uppercase">
              Heepzy
              <span aria-hidden="true" className="text-accent">
                .
              </span>
            </p>
            <p className="mt-3 max-w-xs text-sm text-on-panel-muted">
              Sneakers, formals, khussa and heels — delivered to your door anywhere in Pakistan.
            </p>
            {s.supportPhone || s.supportEmail ? (
              <ul className="mt-5 grid gap-1 text-sm">
                {s.supportPhone ? <li>{s.supportPhone}</li> : null}
                {s.supportEmail ? (
                  <li>
                    <a href={`mailto:${s.supportEmail}`} className="hover:underline">
                      {s.supportEmail}
                    </a>
                  </li>
                ) : null}
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
          <div className="container-page flex flex-wrap items-center justify-between gap-4 py-5 text-xs font-semibold text-on-panel-muted">
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
            <p>© 2026 Heepzy. All prices in PKR.</p>
          </div>
        </div>
      </FooterDrawer>
    </footer>
  );
}
