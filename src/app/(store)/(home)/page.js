import Image from "next/image";
import Link from "next/link";
import { getHomeCatalog, getHomeReviews } from "@/lib/catalog";
import { getStoreSettings } from "@/lib/settings";
import { formatPKR } from "@/lib/money";
import { CAMPAIGN } from "@/lib/campaign";
import { getPerks } from "@/components/layout/announcement-bar";
import { HomeProducts } from "@/components/store/home-products";
import { Countdown } from "@/components/store/countdown";
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

export default async function HomePage() {
  const [{ products, categories, maxDiscount }, settings, reviews] = await Promise.all([
    getHomeCatalog(),
    getStoreSettings(),
    getHomeReviews(),
  ]);
  const perks = getPerks(settings);
  const newest = products.find((p) => p.image)?.image;

  return (
    <>
      {/* ───────── Campaign hero ───────── */}
      <section aria-labelledby="hero-title" className="relative isolate overflow-hidden bg-panel text-on-panel">
        <Image
          src={saleHero}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="-z-10 object-cover object-[70%_center]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-r from-panel/95 via-panel/70 to-panel/10 max-md:bg-panel/70"
        />
        <div className="container-page flex min-h-[520px] flex-col justify-center py-14 lg:min-h-[600px]">
          <p className="script text-[clamp(34px,4vw,50px)] text-saffron">{CAMPAIGN.kicker}</p>
          <h1 id="hero-title" className="mt-2 display text-[clamp(72px,11vw,156px)] leading-[0.88]">
            {CAMPAIGN.title} <span className="text-accent">{CAMPAIGN.highlight}</span>
          </h1>
          {maxDiscount > 0 ? (
            <p className="mt-3 display text-[clamp(32px,4vw,58px)] font-medium">
              Up to {maxDiscount}% off{" "}
              <span className="align-middle text-[0.45em] tracking-[0.04em] text-on-panel-muted">selected styles</span>
            </p>
          ) : null}
          <Countdown endsAt={CAMPAIGN.endsAt} className="mt-7" />
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products?gender=women&sale=1"
              className="btn min-h-13 bg-accent px-8 text-accent-fg hover:bg-accent-hover"
            >
              Shop women
            </Link>
            <Link
              href="/products?gender=men&sale=1"
              className="btn min-h-13 bg-on-panel px-8 text-panel hover:opacity-90"
            >
              Shop men
            </Link>
          </div>
        </div>
      </section>

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

      {/* ───────── Campaign tiles ───────── */}
      <section aria-label="Collections" className="container-page grid gap-3 pt-16 sm:gap-4 lg:grid-cols-2 lg:pt-20">
        <Link
          href="/products?gender=men&category=formal"
          className="group relative block min-h-[460px] overflow-hidden rounded-tile bg-panel text-on-panel lg:min-h-[580px]"
        >
          <Image
            src={desiDrip}
            alt="Young man in a black waistcoat and shalwar kameez"
            fill
            placeholder="blur"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-panel/90 to-transparent"
          />
          <span className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-7 sm:p-9">
            <span className="text-xs font-extrabold tracking-[0.14em] text-saffron uppercase">Festive formals</span>
            <span className="display text-[clamp(44px,5vw,64px)]">Desi Drip</span>
            <span className="max-w-sm text-on-panel-muted">
              Loafers, monks and derbies that finish off a shalwar kameez or sherwani.
            </span>
            <span className="btn mt-2 bg-saffron px-7 text-saffron-fg">
              Shop the edit <ArrowRight className="size-4" />
            </span>
          </span>
        </Link>
        <div className="grid gap-3 sm:gap-4">
          <SplitTile
            href="/products?category=khussa"
            kicker="Shaadi season"
            title="Mehndi to walima"
            image={shaadi}
            alt="Hennaed hands with red and gold bangles"
            tone="bg-accent text-accent-fg"
            button="bg-surface text-brand"
            Icon={Sparkle}
            cta="Shop khussa"
          />
          <SplitTile
            href="#newsletter"
            kicker="Coming soon"
            title="Eid collection"
            image={eid}
            alt="A thin crescent moon in the night sky"
            tone="bg-emerald text-emerald-fg"
            button="bg-surface text-fg"
            Icon={Moon}
            cta="Get early access"
          />
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
      <Link href={href} className="group flex w-[92px] flex-col items-center gap-2 text-center sm:w-[108px]">
        <span className="block size-[88px] rounded-full bg-[conic-gradient(var(--hz-accent),var(--hz-saffron),var(--hz-emerald),var(--hz-accent))] p-[3px] sm:size-[104px]">
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
    <Link href={href} className={`group relative block h-[420px] overflow-hidden rounded-tile lg:h-[520px] ${tone}`}>
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

function SplitTile({ href, kicker, title, image, alt, tone, button, Icon, cta }) {
  return (
    <Link href={href} className={`group relative flex min-h-[250px] overflow-hidden rounded-tile ${tone}`}>
      <span className="relative z-10 flex max-w-[60%] flex-col items-start justify-center gap-2 p-6 sm:max-w-[55%] sm:p-9">
        <span className="flex items-center gap-2">
          <Icon className="size-5" />
          <span className="script text-[26px] whitespace-nowrap sm:text-[30px]">{kicker}</span>
        </span>
        <span className="display text-[clamp(34px,3.4vw,46px)]">{title}</span>
        <span className={`btn mt-2 min-h-11 px-5 whitespace-nowrap sm:px-6 ${button}`}>
          {cta} <ArrowRight className="size-4" />
        </span>
      </span>
      <span className="absolute inset-y-0 right-0 w-[48%]">
        <Image
          src={image}
          alt={alt}
          fill
          placeholder="blur"
          sizes="(min-width: 1024px) 24vw, 48vw"
          className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
        />
      </span>
    </Link>
  );
}
