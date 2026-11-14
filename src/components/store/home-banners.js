import Image from "next/image";
import Link from "next/link";
import { Countdown } from "@/components/store/countdown";
import { ArrowRight } from "@/components/ui/icons";
import { THEMES } from "@/lib/banner-slots";

/**
 * Home page hero and campaign tiles. Each takes a banner (from Admin → Banners,
 * or the built-in default) so the admin preview renders exactly what the store shows.
 * `image` is a URL string or a static import.
 */
const blur = (image) => (typeof image === "object" && image?.blurDataURL ? "blur" : "empty");

export function HomeHero({ banner: b, maxDiscount = 0, preview = false }) {
  const Heading = preview ? "p" : "h1";
  return (
    <section
      aria-labelledby={preview ? undefined : "hero-title"}
      className="relative isolate overflow-hidden bg-panel text-on-panel"
    >
      {b.image ? (
        <Image
          src={b.image}
          alt={b.imageAlt ?? ""}
          fill
          priority={!preview}
          placeholder={blur(b.image)}
          sizes="100vw"
          className="-z-10 object-cover object-[70%_center]"
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-r from-panel/95 via-panel/70 to-panel/10 max-md:bg-panel/70"
      />
      <div className="container-page flex min-h-132 flex-col justify-center py-14 lg:min-h-155">
        {b.kicker ? <p className="script text-[clamp(34px,4vw,50px)] text-saffron">{b.kicker}</p> : null}
        <Heading
          id={preview ? undefined : "hero-title"}
          className="mt-2 display text-[clamp(72px,11vw,156px)] leading-[0.88]"
        >
          {b.title}
          {b.highlight ? (
            <>
              {" "}
              <span className="text-accent">{b.highlight}</span>
            </>
          ) : null}
        </Heading>
        {b.subtitle ? (
          <p className="mt-4 max-w-xl text-[clamp(17px,1.6vw,22px)] font-semibold text-on-panel-muted">{b.subtitle}</p>
        ) : maxDiscount > 0 ? (
          <p className="mt-3 display text-[clamp(32px,4vw,58px)] font-medium">
            Up to {maxDiscount}% off{" "}
            <span className="align-middle text-[0.45em] tracking-[0.04em] text-on-panel-muted">selected styles</span>
          </p>
        ) : null}
        {b.showCountdown && b.endsAt ? <Countdown endsAt={b.endsAt} className="mt-7" /> : null}
        {b.href || b.href2 ? (
          <div className="mt-8 flex flex-wrap gap-3">
            {b.href ? (
              <Link href={b.href} className="btn min-h-13 bg-accent px-8 text-accent-fg hover:bg-accent-hover">
                {b.buttonLabel || "Shop now"}
              </Link>
            ) : null}
            {b.href2 ? (
              <Link href={b.href2} className="btn min-h-13 bg-on-panel px-8 text-panel hover:opacity-90">
                {b.button2Label || "Shop now"}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function LargeTile({ banner: b }) {
  return (
    <Link
      href={b.href || "/products"}
      className="group relative block min-h-115 overflow-hidden rounded-tile bg-panel text-on-panel lg:min-h-145"
    >
      {b.image ? (
        <Image
          src={b.image}
          alt={b.imageAlt ?? ""}
          fill
          placeholder={blur(b.image)}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.03]"
        />
      ) : null}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-panel/90 to-transparent"
      />
      <span className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-7 sm:p-9">
        {b.kicker ? (
          <span className="text-xs font-extrabold tracking-[0.14em] text-saffron uppercase">{b.kicker}</span>
        ) : null}
        <span className="display text-[clamp(44px,5vw,64px)]">{b.title}</span>
        {b.subtitle ? <span className="max-w-sm text-on-panel-muted">{b.subtitle}</span> : null}
        <span className="btn mt-2 bg-saffron px-7 text-saffron-fg">
          {b.buttonLabel || "Shop now"} <ArrowRight className="size-4" />
        </span>
      </span>
    </Link>
  );
}

export function SplitTile({ banner: b }) {
  const theme = THEMES[b.theme] ?? THEMES.crimson;
  const Icon = b.Icon;
  return (
    <Link
      href={b.href || "/products"}
      className={`group relative flex min-h-62.5 overflow-hidden rounded-tile ${theme.panel}`}
    >
      <span className="relative z-10 flex max-w-[60%] flex-col items-start justify-center gap-2 p-6 sm:max-w-[55%] sm:p-9">
        {b.kicker ? (
          <span className="flex items-center gap-2">
            {Icon ? <Icon className="size-5" /> : null}
            <span className="script text-[26px] whitespace-nowrap sm:text-[30px]">{b.kicker}</span>
          </span>
        ) : null}
        <span className="display text-[clamp(34px,3.4vw,46px)]">{b.title}</span>
        <span className={`btn mt-2 min-h-11 px-5 whitespace-nowrap sm:px-6 ${theme.button}`}>
          {b.buttonLabel || "Shop now"} <ArrowRight className="size-4" />
        </span>
      </span>
      {b.image ? (
        <span className="absolute inset-y-0 right-0 w-[48%]">
          <Image
            src={b.image}
            alt={b.imageAlt ?? ""}
            fill
            placeholder={blur(b.image)}
            sizes="(min-width: 1024px) 24vw, 48vw"
            className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
          />
        </span>
      ) : null}
    </Link>
  );
}
