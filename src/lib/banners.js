import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { offerAwareLife } from "@/lib/pricing";
import { SLOTS } from "@/lib/banner-slots";

export const BANNERS_TAG = "banners";

const fields = {
  id: true,
  kicker: true,
  title: true,
  highlight: true,
  subtitle: true,
  imageUrl: true,
  imageAlt: true,
  href: true,
  buttonLabel: true,
  href2: true,
  button2Label: true,
  theme: true,
  showCountdown: true,
  placement: true,
  endsAt: true,
};

/**
 * The live banner for each home page slot ({ HOME_HERO: banner | null, … }).
 * Cached until the next scheduled start or end, so banners switch on time.
 */
export async function getHomeBanners() {
  "use cache";
  cacheTag(BANNERS_TAG);
  const now = new Date();
  const rows = await db.banner.findMany({
    where: { isActive: true, placement: { in: Object.keys(SLOTS) }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
    orderBy: [{ sortOrder: "asc" }, { startsAt: "desc" }, { createdAt: "desc" }],
    select: { ...fields, startsAt: true },
  });

  // Next moment something starts or ends.
  const changes = rows
    .flatMap((b) => [b.startsAt, b.endsAt])
    .filter((d) => d && d > now)
    .map((d) => Math.ceil((d - now) / 1000));
  cacheLife(offerAwareLife({ changesIn: changes.length ? Math.min(...changes) : null }, 3600));

  const live = rows.filter((b) => !b.startsAt || b.startsAt <= now);
  return Object.fromEntries(
    Object.keys(SLOTS).map((slot) => {
      const b = live.find((x) => x.placement === slot);
      return [slot, b ? { ...b, startsAt: undefined, endsAt: b.endsAt?.toISOString() ?? null } : null];
    }),
  );
}
