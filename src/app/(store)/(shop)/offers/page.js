import Link from "next/link";
import { getLiveOffers, listProducts, parseFilters } from "@/lib/catalog";
import { ProductCard } from "@/components/store/product-card";
import { ArrowRight, Clock } from "@/components/ui/icons";

export const metadata = { title: "Offers", description: "Shoes on sale at Heepzy — limited sizes, while stocks last." };

const endsFmt = new Intl.DateTimeFormat("en-PK", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Karachi",
});

export default async function OffersPage() {
  const [offers, { products }] = await Promise.all([
    getLiveOffers(),
    listProducts(parseFilters({ sale: "1", sort: "featured" })),
  ]);
  const best = Math.max(
    0,
    ...products.filter((p) => p.compareAt).map((p) => Math.round(((p.compareAt - p.price) / p.compareAt) * 100)),
  );
  const lead = offers.length === 1 ? offers[0] : null;

  return (
    <div className="container-page pt-10 pb-28">
      <section className="mb-10 overflow-hidden rounded-panel bg-accent px-6 py-14 text-accent-fg sm:px-12">
        <p className="text-xs font-bold tracking-[0.16em] uppercase">{lead ? lead.label : "Limited time"}</p>
        <h1 className="mt-3 display text-[clamp(56px,8vw,128px)]">{lead ? lead.name : "Sale on now"}</h1>
        <p className="mt-4 max-w-md font-medium">
          {lead?.description ||
            (best
              ? `Up to ${best}% off selected styles. Sizes go fast — when they're gone, they're gone.`
              : "Sizes go fast — when they're gone, they're gone.")}
        </p>
        {lead?.endsAt ? (
          <p className="mt-5 inline-flex items-center gap-2 text-sm font-bold">
            <Clock className="size-4" /> Ends {endsFmt.format(new Date(lead.endsAt))}
          </p>
        ) : null}
      </section>

      {offers.length > 1 ? (
        <ul className="mb-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Offers running now">
          {offers.map((o) => (
            <li key={o.slug}>
              <Link
                href={`/products?offer=${o.slug}`}
                className="group flex h-full flex-col gap-1 rounded-card border border-line bg-surface p-5 hover:border-fg"
              >
                <span className="text-xs font-bold tracking-[0.12em] text-brand uppercase">{o.label}</span>
                <span className="heading text-2xl">{o.name}</span>
                {o.description ? <span className="text-sm text-fg-muted">{o.description}</span> : null}
                <span className="mt-auto flex items-center justify-between pt-3 text-[13px] font-semibold">
                  <span className="text-fg-muted">{o.endsAt ? `Ends ${endsFmt.format(new Date(o.endsAt))}` : ""}</span>
                  <span className="inline-flex items-center gap-1">
                    Shop <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {products.length ? (
        <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 3} />
          ))}
        </div>
      ) : (
        <div className="rounded-card bg-muted p-12 text-center">
          <p className="heading text-3xl">No offers running right now.</p>
          <Link href="/products" className="btn-ink mt-6">
            Browse all shoes
          </Link>
        </div>
      )}
      {products.length >= 12 ? (
        <p className="mt-10 text-center">
          <Link href="/products?sale=1" className="btn-outline">
            See everything on sale
          </Link>
        </p>
      ) : null}
    </div>
  );
}
