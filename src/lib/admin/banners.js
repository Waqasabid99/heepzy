import "server-only";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { SLOTS } from "@/lib/banner-slots";

/** live | scheduled | ended | off; `waiting` = live dates but another banner in the slot comes first. */
export function bannerState(b, now = new Date()) {
  if (!b.isActive) return "off";
  if (b.endsAt && b.endsAt <= now) return "ended";
  if (b.startsAt && b.startsAt > now) return "scheduled";
  return "live";
}

/** Every banner, grouped by slot, in the order the store picks them. */
export async function listBannersBySlot() {
  await requireStaff();
  const rows = await db.banner.findMany({
    where: { placement: { in: Object.keys(SLOTS) } },
    orderBy: [{ sortOrder: "asc" }, { startsAt: "desc" }, { createdAt: "desc" }],
  });
  const now = new Date();
  return Object.keys(SLOTS).map((slot) => {
    let shown = false;
    const banners = rows
      .filter((b) => b.placement === slot)
      .map((b) => {
        let state = bannerState(b, now);
        if (state === "live") {
          if (shown) state = "waiting";
          shown = true;
        }
        return {
          id: b.id,
          name: b.name || b.title,
          title: b.title,
          imageUrl: b.imageUrl,
          state,
          startsAt: b.startsAt?.toISOString() ?? null,
          endsAt: b.endsAt?.toISOString() ?? null,
          isActive: b.isActive,
        };
      });
    return { slot, ...SLOTS[slot], banners, usingDefault: !shown };
  });
}

export async function getBanner(id) {
  await requireStaff();
  const b = await db.banner.findUnique({ where: { id } });
  if (!b) return null;
  return {
    ...b,
    startsAt: b.startsAt?.toISOString() ?? null,
    endsAt: b.endsAt?.toISOString() ?? null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}
