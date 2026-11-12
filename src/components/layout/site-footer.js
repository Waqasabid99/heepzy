import Link from "next/link";
import { NewsletterForm } from "./newsletter-form";
import { DrawerItem, FooterDrawer } from "@/components/motion/footer-drawer";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      ["Men", "/products?gender=men"],
      ["Women", "/products?gender=women"],
      ["Sneakers", "/products?category=sneakers"],
      ["Offers", "/offers"],
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

/*
 * The yellow card is the same in both themes, so its text uses fixed ink
 * (#111) rather than theme tokens — the accent fill stays light in dark mode.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto px-3 pb-3 sm:px-5 sm:pb-5">
      <FooterDrawer className="mx-auto max-w-content overflow-hidden rounded-panel bg-panel p-5 text-on-panel sm:p-10">
        <DrawerItem
          as="p"
          aria-hidden="true"
          from={0.05}
          to={0.8}
          distance={160}
          className="text-center font-display text-[clamp(88px,19vw,300px)] leading-[0.82] font-semibold tracking-[-0.02em] text-accent select-none"
        >
          Heepzy
        </DrawerItem>
        <DrawerItem
          from={0.25}
          to={1}
          className="mt-6 flex flex-col gap-10 rounded-card bg-accent p-6 text-[#111] sm:p-10"
        >
          <div className="flex flex-wrap items-end justify-between gap-8">
            <h2 className="font-display text-[clamp(36px,4vw,56px)] leading-[1.02] font-semibold">
              Step into your
              <br />
              best style
            </h2>
            <NewsletterForm />
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <p className="mb-2.5 font-extrabold">{col.title}</p>
                <ul className="grid gap-1.5">
                  {col.links.map(([label, href]) => (
                    <li key={href}>
                      <Link href={href} className="hover:underline">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            <div>
              <p className="mb-2.5 font-extrabold">Customer care</p>
              <ul className="grid gap-1.5">
                <li>Mon – Sat, 10am – 7pm</li>
                <li>Nationwide delivery</li>
              </ul>
            </div>
            <div>
              <p className="mb-2.5 font-extrabold">We accept</p>
              <ul className="grid gap-1.5">
                <li>Cash on delivery</li>
                <li>Visa · Mastercard</li>
                <li>Digital wallets</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-3 border-t border-[#111]/20 pt-5 text-xs font-semibold">
            <p>© 2026 Heepzy. All prices in PKR.</p>
            <p>Photography: Unsplash</p>
          </div>
        </DrawerItem>
      </FooterDrawer>
    </footer>
  );
}
