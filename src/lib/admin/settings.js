import "server-only";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { toPlain } from "@/lib/serialize";

/** Admin settings reads (uncached: admins edit these). */
export async function getSettingsForAdmin() {
  await requireStaff();
  const s = await db.storeSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return toPlain(s);
}

export async function getDeliveryZones() {
  await requireStaff();
  const zones = await db.deliveryZone.findMany({
    orderBy: [{ isDefault: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { rates: { orderBy: { price: "asc" } } },
  });
  return toPlain(zones).map((z) => ({
    ...z,
    provinces: Array.isArray(z.provinces) ? z.provinces : [],
    cities: Array.isArray(z.cities) ? z.cities : [],
  }));
}

export async function getTaxRates() {
  await requireStaff();
  return toPlain(await db.taxRate.findMany({ orderBy: [{ isActive: "desc" }, { priority: "desc" }, { name: "asc" }] }));
}
