import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { toPlain } from "@/lib/serialize";

export const SETTINGS_TAG = "store-settings";

/**
 * Store-wide settings (returns enabled, COD, free delivery...). Cached on the
 * server; call `revalidateTag(SETTINGS_TAG)` / `updateTag` after admin edits.
 */
export async function getStoreSettings() {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("hours");

  const settings = await db.storeSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return toPlain(settings);
}
