import Link from "next/link";
import { getStoreSettings } from "@/lib/settings";
import { formatPKR } from "@/lib/money";
import { ArrowRight, Banknote, CreditCard, Exchange, Truck } from "@/components/ui/icons";

/** Store perks (free delivery, COD, exchange, cards) for the home page "Pay your way" block. */
export function getPerks(s) {
  return [
    s.freeDeliveryEnabled && s.freeDeliveryThreshold
      ? { Icon: Truck, title: "Free delivery", text: `On orders over ${formatPKR(s.freeDeliveryThreshold)}` }
      : { Icon: Truck, title: "Nationwide delivery", text: "To every city in Pakistan" },
    s.codEnabled ? { Icon: Banknote, title: "Cash on delivery", text: "Pay when your order arrives" } : null,
    s.returnsEnabled
      ? { Icon: Exchange, title: `${s.returnWindowDays}-day exchange`, text: "Wrong size? Swap it easily" }
      : null,
    s.cardPaymentsEnabled ? { Icon: CreditCard, title: "Cards & wallets", text: "Secure online payment" } : null,
  ].filter(Boolean);
}

/**
 * Crimson promo bar (text + link from Admin → Settings: announcementText /
 * announcementLink). Hidden when the text is empty.
 */
export async function AnnouncementBar() {
  const s = await getStoreSettings();
  const text = s.announcementText?.trim();
  // Only same-site paths are allowed as links from settings.
  const href = s.announcementLink?.startsWith("/") && !s.announcementLink.startsWith("//") ? s.announcementLink : null;

  return (
    <div>
      {text ? (
        <div className="bg-accent text-[13px] font-semibold tracking-[0.03em] text-accent-fg sm:text-sm">
          {href ? (
            <Link
              href={href}
              className="group container-page flex min-h-10 items-center justify-center gap-2 py-2 text-center hover:underline"
            >
              <span>{text}</span>
              <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
          ) : (
            <p className="container-page flex min-h-10 items-center justify-center py-2 text-center">{text}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
