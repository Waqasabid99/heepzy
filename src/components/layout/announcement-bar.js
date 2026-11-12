import Link from "next/link";
import { getStoreSettings } from "@/lib/settings";
import { formatPKR } from "@/lib/money";

/**
 * Full-width black promo bar. Text + link come from Store settings
 * (announcementText / announcementLink); when empty it falls back to the
 * store's delivery / COD / exchange perks.
 */
export async function AnnouncementBar() {
  const s = await getStoreSettings();
  const fallback = [
    s.freeDeliveryEnabled && s.freeDeliveryThreshold
      ? `Free delivery above ${formatPKR(s.freeDeliveryThreshold)}`
      : null,
    s.codEnabled ? "Cash on delivery nationwide" : null,
    s.returnsEnabled ? `${s.returnWindowDays}-day easy exchange` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  const text = s.announcementText?.trim() || fallback;
  if (!text) return null;

  // Only same-site paths are allowed as links from settings.
  const href = s.announcementLink?.startsWith("/") && !s.announcementLink.startsWith("//") ? s.announcementLink : null;
  const content = (
    <>
      <span className="truncate">{text}</span>
      {href ? (
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="shrink-0 transition-transform group-hover:translate-x-1"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      ) : null}
    </>
  );

  return (
    <div className="bg-black text-[13px] tracking-[0.06em] text-white sm:text-sm">
      {href ? (
        <Link
          href={href}
          className="group container-page flex h-10 items-center justify-center gap-2.5 hover:underline sm:h-11"
        >
          {content}
        </Link>
      ) : (
        <p className="container-page flex h-10 items-center justify-center gap-2.5 sm:h-11">{content}</p>
      )}
    </div>
  );
}
