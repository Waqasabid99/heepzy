import { BRAND } from "@/lib/brand";

/** "MR.SHOES" set in the display face, with the brand-red dot. Decorative: give the link an aria-label. */
export function Wordmark({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`font-display leading-none font-semibold tracking-[0.03em] uppercase ${className}`}
    >
      Mr<span className="text-accent">.</span>Shoes
    </span>
  );
}

export const BRAND_HOME_LABEL = `${BRAND.name} home`;
