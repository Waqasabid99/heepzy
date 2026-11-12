import "server-only";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/request";

/** Record an admin/system action. Never let audit failures break the main action. */
export async function audit({ actorId, action, entity, entityId, metadata }) {
  try {
    await db.auditLog.create({
      data: {
        actorId: actorId ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        metadata: metadata ?? undefined,
        ipAddress: await getClientIp(),
      },
    });
  } catch (err) {
    console.error("[audit] failed to write log", action, err);
  }
}
