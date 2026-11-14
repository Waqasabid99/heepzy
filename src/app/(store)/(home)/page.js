import Image from "next/image";
import Link from "next/link";
import { getHomeCatalog, getHomeReviews } from "@/lib/catalog";
import { getStoreSettings } from "@/lib/settings";
import { formatPKR } from "@/lib/money";
import { CAMPAIGN } from "@/lib/campaign";
import { getPerks } from "@/components/layout/announcement-bar";
import { HomeProducts } from "@/components/store/home-products";
import { HomeHero, LargeTile, SplitTile } from "@/components/store/home-banners";
import { getHomeBanners } from "@/lib/banners";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { ArrowRight, Moon, Percent, ShieldCheck, Sparkle, Star } from "@/components/ui/icons";
import saleHero from "../../../../public/images/campaign/mega-sale.jpg";
import women from "../../../../public/images/campaign/women.jpg";
import men from "../../../../public/images/campaign/men.jpg";
import sneakers from "../../../../public/images/lifestyle/high-tops.jpg";
import desiDrip from "../../../../public/images/campaign/desi-drip.jpg";
import shaadi from "../../../../public/images/campaign/shaadi.jpg";
import eid from "../../../../public/images/campaign/eid.jpg";

export const metadata = {
  title: { absolute: "Heepzy — Shoes, khussa & sneakers delivered across Pakistan" },
};

const BUDGET = 5000;

/** Shown when Admin → Banners has nothing live for a slot. */
const DEFAULT_HERO = {
  kicker: CAMPAIGN.kicker,
  title: CAMPAIGN.title,
  highlight: CAMPAIGN.highlight,
  image: saleHero,
  imageAlt: "",
  href: "/products?gender=women&sale=1",
  buttonLabel: "Shop women",
  href2: "/products?gender=men&sale=1",
  button2Label: "Shop men",
  showCountdown: true,
  endsAt: CAMPAIGN.endsAt,
};
const DEFAULT_TILES = [
  {
    href: "/products?gender=men&category=formal",
    kicker: "Festive formals",
    title: "Desi Drip",
    subtitle: "Loafers, monks and derbies that finish off a shalwar kameez or sherwani.",
    image: desiDrip,
    imageAlt: "Young man in a black waistcoat and shalwar kameez",
    buttonLabel: "Shop the edit",
  },
  {
    href: "/products?category=khussa",
    kicker: "Shaadi season",
    title: "Mehndi to walima",
    image: shaadi,
    imageAlt: "Hennaed hands with red and gold bangles",
    theme: "crimson",
    Icon: Sparkle,
    buttonLabel: "Shop khussa",
  },
  {
    href: "#newsletter",
    kicker: "Coming soon",
    title: "Eid collection",
    image: eid,
    imageAlt: "A thin crescent moon in the night sky",
    theme: "emerald",
    Icon: Moon,
    buttonLabel: "Get early access",
  },
];

export default async function HomePage() {
  const [{ products, categories, maxDiscount }, settings, reviews, banners] = await Promise.all([
    getHomeCatalog(),
    getStoreSettings(),
    getHomeReviews(),
    getHomeBanners(),
  ]);
  const fromAdmin = (b) => b && { ...b, image: b.imageUrl };
  const hero = fromAdmin(banners.HOME_HERO) ?? DEFAULT_HERO;
  const tiles = [
    fromAdmin(banners.HOME_TILE_1) ?? DEFAULT_TILES[0],
    fromAdmin(banners.HOME_TILE_2) ?? DEFAULT_TILES[1],
    fromAdmin(banners.HOME_TILE_3) ?? DEFAULT_TILES[2],
  ];
  const perks = getPerks(settings);
  const newest = products.find((p) => p.image)?.image;

  return (
    <>
      {/* ───────── Campaign hero (Admin → Banners, or the built-in campaign) ───────── */}
      <HomeHero banner={hero} maxDiscount={maxDiscount} />

      {/* ───────── Category circles ───────── */}
      <section aria-label="Shop by category" className="container-page pt-9 pb-2">
        <ul className="scroll-row gap-5 pb-2 sm:gap-7 lg:justify-between">
          {newest ? (
            <CircleLink href="/products?sort=newest" label="New in">
              <Image src={newest.url} alt="" fill sizes="104px" className="object-cover" />
            </CircleLink>
          ) : null}
          <CircleLink href="/offers" label="Sale" labelClass="text-brand">
            <span className="grid size-full place-items-center bg-accent text-accent-fg">
              <Percent className="size-9" strokeWidth={2.2} />
            </span>
          </CircleLink>
          {categories
            .filter((c) => c.imageUrl && c.count > 0)
            .map((c) => (
              <CircleLink key={c.slug} href={`/products?category=${c.slug}`} label={c.name}>
                <Image src={c.imageUrl} alt="" fill sizes="104px" className="object-cover" />
              </CircleLink>
            ))}
          <CircleLink href={`/products?max=${BUDGET}`} label="Budget buys">
            <span className="grid size-full place-items-center bg-saffron text-center font-display text-[15px] leading-tight font-semibold text-saffron-fg uppercase">
              Under
              <br />
              {formatPKR(BUDGET)}
            </span>
          </CircleLink>
        </ul>
      </section>

      {/* ───────── Women / Men / Sneakers colour blocks ───────── */}
      <section aria-label="Shop by department" className="container-page grid gap-3 pt-8 sm:gap-4 md:grid-cols-3">
        <BlockLink
          href="/products?gender=women"
          kicker="for her"
          title="Women"
          sub="Heels · Khussa · Flats"
          image={women}
          alt="Woman in a red and gold bridal outfit"
          tone="bg-accent text-accent-fg"
          button="bg-surface text-brand"
        />
        <BlockLink
          href="/products?gender=men"
          kicker="for him"
          title="Men"
          sub="Formal · Loafers · Sneakers"
          image={men}
          alt="Man in a navy prince coat and white shalwar"
          tone="bg-emerald text-emerald-fg"
          button="bg-surface text-fg"
        />
        <BlockLink
          href="/products?category=sneakers"
          kicker="for every day"
          title="Sneakers"
          sub="Runners · Court · High-tops"
          image={sneakers}
          alt="High-top sneakers on city steps"
          tone="bg-saffron text-saffron-fg"
          button="bg-fg text-bg"
        />
      </section>

      {/* ───────── Trending products ───────── */}
      <section aria-labelledby="exclusives-title" className="container-page pt-16 lg:pt-20">
        <HomeProducts products={products} />
      </section>

      {/* ───────── Pay your way ───────── */}
      <section aria-labelledby="pay-title" className="container-page pt-16 lg:pt-20">
        <ScrollReveal
          distance={60}
          scaleFrom={0.96}
          className="grid overflow-hidden rounded-tile bg-brand-gradient text-white lg:grid-cols-[1.1fr_1fr]"
        >
          <div className="flex flex-col items-start gap-4 p-7 sm:p-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-extrabold tracking-[0.08em] text-brand uppercase dark:text-accent">
              <ShieldCheck className="size-4" /> Shop with confidence
            </span>
            <h2 id="pay-title" className="display text-[clamp(44px,5.5vw,76px)]">
              Pay your way
            </h2>
            <p className="max-w-md text-[17px] font-semibold text-white/90">
              {[
                settings.codEnabled ? "Cash on delivery" : null,
                settings.cardPaymentsEnabled ? "debit & credit cards" : null,
                settings.cardPaymentsEnabled ? "digital wallets" : null,
              ]
                .filter(Boolean)
                .join(", ")
                .replace(/^./, (c) => c.toUpperCase()) || "Secure checkout"}
              {" — "}delivered to your door anywhere in Pakistan.
            </p>
            <Link href="/products" className="btn mt-2 bg-white px-8 text-brand hover:bg-white/90 dark:text-accent">
              Start shopping <ArrowRight className="size-4" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 p-5 pt-0 sm:p-10 sm:pt-0 lg:pt-10 lg:pl-0 [&>li:last-child:nth-child(odd)]:col-span-2">
            {perks.map(({ Icon, title, text }) => (
              <li key={title} className="flex flex-col gap-2 rounded-2xl border border-white/35 bg-white/15 p-5">
                <Icon className="size-7" />
                <span className="font-display text-xl leading-tight font-semibold uppercase">{title}</span>
                <span className="text-[13px] text-white/85">{text}</span>
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </section>

      {/* ───────── Campaign tiles (Admin → Banners, or the built-in tiles) ───────── */}
      <section aria-label="Collections" className="container-page grid gap-3 pt-16 sm:gap-4 lg:grid-cols-2 lg:pt-20">
        <LargeTile banner={tiles[0]} />
        <div className="grid gap-3 sm:gap-4">
          <SplitTile banner={tiles[1]} />
          <SplitTile banner={tiles[2]} />
        </div>
      </section>

      {/* ───────── Reviews (only when there are approved reviews) ───────── */}
      {reviews.length ? (
        <section aria-labelledby="reviews-title" className="mt-16 bg-muted py-14 lg:mt-20">
          <div className="container-page">
            <h2 id="reviews-title" className="mb-8 text-center display text-[clamp(30px,3.4vw,44px)]">
              Loved across Pakistan
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {reviews.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 rounded-2xl bg-surface p-6">
                  <span className="flex text-saffron" role="img" aria-label={`${r.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} filled={i < r.rating} className="size-4" />
                    ))}
                  </span>
                  <p className="flex-1">“{r.body}”</p>
                  <p className="text-[13px] font-bold">
                    {r.author} ·{" "}
                    <Link href={`/products/${r.product.slug}`} className="font-semibold text-fg-muted hover:underline">
                      {r.product.name}
                    </Link>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <div className="pt-16 lg:pt-20" />
      )}
    </>
  );
}

function CircleLink({ href, label, labelClass = "", children }) {
  return (
    <li className="shrink-0 snap-start">
      <Link href={href} className="group flex w-23 flex-col items-center gap-2 text-center sm:w-27">
        <span className="block size-22 rounded-full bg-[conic-gradient(var(--hz-accent),var(--hz-saffron),var(--hz-emerald),var(--hz-accent))] p-0.75 sm:size-26">
          <span className="relative block size-full overflow-hidden rounded-full border-[3px] border-bg transition-transform duration-500 ease-out-soft group-hover:scale-[0.97]">
            {children}
          </span>
        </span>
        <span className={`text-[13px] leading-tight font-bold ${labelClass}`}>{label}</span>
      </Link>
    </li>
  );
}

function BlockLink({ href, kicker, title, sub, image, alt, tone, button }) {
  return (
    <Link href={href} className={`group relative block h-105 overflow-hidden rounded-tile lg:h-130 ${tone}`}>
      <span className="absolute right-0 bottom-0 h-[64%] w-[76%] overflow-hidden rounded-tl-[140px]">
        <Image
          src={image}
          alt={alt}
          fill
          placeholder="blur"
          sizes="(min-width: 768px) 24vw, 70vw"
          className="object-cover object-top transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
        />
      </span>
      <span className="absolute top-6 left-6 flex flex-col sm:top-7 sm:left-7">
        <span className="script text-[32px]">{kicker}</span>
        <span className="display text-[clamp(48px,5vw,66px)]">{title}</span>
        <span className="mt-1 text-sm font-bold">{sub}</span>
      </span>
      <span className={`btn absolute bottom-6 left-6 min-h-11 px-6 sm:bottom-7 sm:left-7 ${button}`}>Shop now</span>
    </Link>
  );
}
