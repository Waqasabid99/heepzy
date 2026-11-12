import Image from "next/image";
import Link from "next/link";
import { getHomeCatalog } from "@/lib/catalog";
import { getStoreSettings } from "@/lib/settings";
import { formatPKR } from "@/lib/money";
import { ProductShowcase } from "@/components/store/product-showcase";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import hero from "../../../../public/images/hero/hero.jpg";
import elevate from "../../../../public/images/campaign/elevate.jpg";
import cityStride from "../../../../public/images/lifestyle/city-stride.jpg";
import ankleBoots from "../../../../public/images/lifestyle/ankle-boots.jpg";
import street from "../../../../public/images/lifestyle/street.jpg";
import highTops from "../../../../public/images/lifestyle/high-tops.jpg";
import drop1 from "../../../../public/images/campaign/drop-1.jpg";
import drop2 from "../../../../public/images/campaign/drop-2.jpg";
import drop3 from "../../../../public/images/campaign/drop-3.jpg";
import drop4 from "../../../../public/images/campaign/drop-4.jpg";

export const metadata = {
  title: { absolute: "Heepzy — Reimagined comfort. Shoes delivered across Pakistan." },
};

const Arrow = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default async function HomePage() {
  const [{ products, categories }, settings] = await Promise.all([getHomeCatalog(), getStoreSettings()]);

  return (
    <>
      {/* ───────── Hero ─────────
          Pure black (not the panel token) so the studio photo blends seamlessly in both themes. */}
      <section aria-labelledby="hero-title" className="px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="relative mx-auto max-w-content overflow-hidden rounded-panel bg-black text-on-panel">
          <div className="grid gap-8 px-5 pt-36 pb-8 sm:px-10 sm:pt-32 lg:min-h-[720px] lg:grid-cols-[1fr_1.15fr] lg:pb-10">
            <div className="relative z-10 flex flex-col justify-between gap-10 lg:py-6">
              <h1 id="hero-title" className="display text-[clamp(60px,8.6vw,136px)]">
                Reimagined
                <span className="block font-normal text-accent">Comfort</span>
              </h1>
              <p className="max-w-xs text-on-panel-muted">
                Comfort evolved. Style perfected. Footwear made for the way Pakistan moves — from the first commute to
                the last chai of the night.
              </p>
              <div className="flex flex-wrap items-center gap-3.5">
                <Link href="/products" className="btn-primary min-h-[52px]">
                  Shop the collection <Arrow />
                </Link>
                <Link
                  href="/products?sort=newest"
                  className="btn min-h-[52px] border border-panel-line text-on-panel hover:bg-on-panel/10"
                >
                  New arrivals
                </Link>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-on-panel-muted">
                {settings.codEnabled ? <li>Cash on delivery</li> : null}
                {settings.freeDeliveryEnabled && settings.freeDeliveryThreshold ? (
                  <li>Free delivery over {formatPKR(settings.freeDeliveryThreshold)}</li>
                ) : null}
                {settings.returnsEnabled ? <li>{settings.returnWindowDays}-day exchange</li> : null}
              </ul>
            </div>

            <div className="relative min-h-[420px] sm:min-h-[560px]">
              <Image
                src={hero}
                alt="A pair of grey leather sneakers floating against a black background"
                fill
                priority
                placeholder="blur"
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-contain object-center"
              />
              <div className="absolute top-0 right-0 hidden max-w-60 flex-col items-end gap-3.5 text-right sm:flex">
                <p className="text-[13px] text-on-panel-muted">Built for every mood, every outfit and every move.</p>
                <ul aria-label="Collection highlights" className="flex gap-1.5 text-xs font-bold text-panel">
                  <li className="rounded-full bg-on-panel px-3.5 py-1.5">Comfort</li>
                  <li className="rounded-full bg-accent px-3.5 py-1.5 text-accent-fg">Style</li>
                  <li className="rounded-full bg-on-panel px-3.5 py-1.5">Trendy</li>
                </ul>
              </div>
              <Link
                href="/offers"
                className="absolute right-0 bottom-0 rounded-2xl bg-panel/70 p-4 text-right backdrop-blur-sm transition-colors hover:bg-panel"
              >
                <span className="block font-display text-[28px] leading-tight font-medium">Flash Drop 25%</span>
                <span className="text-[13px] text-on-panel-muted">On selected new arrivals →</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Lifestyle ───────── */}
      <section
        aria-labelledby="life-title"
        className="container-page grid items-center gap-14 pt-28 lg:grid-cols-[0.8fr_1.2fr] lg:pt-36"
      >
        <div className="flex flex-col gap-6">
          <p className="eyebrow">The Heepzy way</p>
          <h2 id="life-title" className="heading text-[clamp(40px,4.4vw,64px)]">
            Not just shoes.
            <br />A lifestyle.
          </h2>
          <p className="max-w-sm text-fg-muted">
            Every pair is designed to match your grind, your goals and your style — and to look just as good on day one
            hundred as on day one.
          </p>
          <Link href="/products" className="btn-primary self-start">
            Live the style
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-3.5">
          <div className="relative aspect-square overflow-hidden rounded-tile">
            <Image
              src={highTops}
              alt="Close-up of high-top sneakers on city steps"
              fill
              sizes="20vw"
              placeholder="blur"
              className="object-cover"
            />
          </div>
          <div className="relative row-span-2 overflow-hidden rounded-tile">
            <Image
              src={cityStride}
              alt="Sneakers mid-stride against a city skyline"
              fill
              sizes="20vw"
              placeholder="blur"
              className="object-cover"
            />
          </div>
          <div className="relative row-span-2 overflow-hidden rounded-tile">
            <Image
              src={street}
              alt="Street style: jeans and leather boots on a pavement"
              fill
              sizes="20vw"
              placeholder="blur"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-square overflow-hidden rounded-tile">
            <Image
              src={ankleBoots}
              alt="Caramel leather ankle boots walking on stone"
              fill
              sizes="20vw"
              placeholder="blur"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ───────── Products ───────── */}
      <section aria-labelledby="upgrade-title" className="container-page pt-28 lg:pt-36">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
          <ScrollReveal as="h2" id="upgrade-title" className="heading text-[clamp(40px,4.4vw,64px)]">
            Your everyday
            <br />
            style upgrade
          </ScrollReveal>
          <ScrollReveal as="p" lag={0.12} className="max-w-sm text-fg-muted sm:text-right">
            Level up your daily look with shoes made for every move — from school runs to weekend plans.
          </ScrollReveal>
        </div>
        <ProductShowcase products={products} categories={categories} />
      </section>

      {/* ───────── Categories ───────── */}
      <section aria-labelledby="cat-title" className="container-page pt-28 lg:pt-36">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
          <h2 id="cat-title" className="heading text-[clamp(36px,3.6vw,52px)]">
            Shop by category
          </h2>
          <Link href="/products" className="text-sm font-bold link-underline">
            View all
          </Link>
        </div>
        {/* Expanding panels: hover/focus widens a tile (see .cat-accordion in globals.css). */}
        <ul className="cat-accordion">
          {categories
            .filter((c) => c.imageUrl)
            .map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/products?category=${c.slug}`}
                  className="group relative block size-full overflow-hidden rounded-tile bg-muted text-on-panel"
                >
                  <Image
                    src={c.imageUrl}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 45vw, 50vw"
                    className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
                  />
                  {/* Scrim keeps the label legible on any photo. */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-panel/85 to-transparent"
                  />
                  <span className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                    <span className="block font-display text-2xl leading-tight font-medium sm:text-[28px]">
                      {c.name}
                    </span>
                    <span className="cat-extra block text-[13px] text-on-panel-muted">{c.count} styles</span>
                  </span>
                  {/* Absolutely positioned so it never squeezes the name on narrow (collapsed) tiles. */}
                  <span className="cat-extra absolute right-6 bottom-6 hidden items-center gap-2 rounded-full bg-accent px-4 py-2 text-[13px] font-bold whitespace-nowrap text-accent-fg sm:inline-flex">
                    Shop now
                    <svg
                      aria-hidden="true"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      </section>

      {/* ───────── ELEVATE campaign ───────── */}
      <section aria-labelledby="elevate-title" className="px-3 pt-28 sm:px-5 lg:pt-36">
        <div className="relative mx-auto grid max-w-content overflow-hidden rounded-panel bg-[#2f4a5c] text-white lg:grid-cols-2">
          <div className="relative min-h-[380px] lg:min-h-[600px]">
            <Image
              src={elevate}
              alt="Olive high-top boots splashing through a puddle on a city street"
              fill
              placeholder="blur"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col items-start justify-center gap-5 p-8 sm:p-14 lg:items-end lg:text-right">
            <h2 id="elevate-title" className="display text-[clamp(84px,11vw,168px)] leading-[0.86]">
              Elevate
            </h2>
            <p className="max-w-sm text-[#e6edf2]">
              The Omni 9 is here — bold looks, all-day comfort and grip for whatever the monsoon throws at you.
            </p>
            <p className="font-display text-3xl font-medium text-accent">Omni 9</p>
            <Link href="/products/omni-9" className="btn min-h-[52px] bg-white text-[#111] hover:bg-white/90">
              Discover Omni 9 <Arrow />
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── New drop ───────── */}
      <section
        aria-labelledby="drop-title"
        className="container-page grid items-center gap-14 py-28 lg:grid-cols-2 lg:py-36"
      >
        <div className="flex flex-col gap-6">
          <h2 id="drop-title" className="heading text-[clamp(40px,4.4vw,64px)]">
            Your next-level kicks
            <br />
            just dropped.
          </h2>
          <p className="max-w-md text-fg-muted">
            Designed for those who move different. Sleek design, premium comfort and a fearless vibe for a new
            generation.
          </p>
          <Link href="/products?sort=newest" className="btn-primary min-h-[52px] self-start">
            Shop the drop <Arrow />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {[
            [drop1, "Chunky multicolour sneakers on wet asphalt"],
            [drop2, "Grey knit sneaker tossed into the air"],
            [drop3, "Lacing up tan leather work boots"],
            [drop4, "Blush chunky sneaker on a white background"],
          ].map(([src, alt]) => (
            <div key={alt} className="relative aspect-[4/3] overflow-hidden rounded-tile">
              <Image
                src={src}
                alt={alt}
                fill
                placeholder="blur"
                sizes="(min-width: 1024px) 24vw, 45vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
