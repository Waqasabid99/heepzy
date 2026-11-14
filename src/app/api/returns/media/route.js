import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getOrderForViewer } from "@/lib/orders";
import { getStoreSettings } from "@/lib/settings";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { openReturnQuantities, returnEligibility } from "@/lib/returns";
import { countMedia, MAX_FILES_PER_ORDER, MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, saveReturnMedia } from "@/lib/return-media";

/**
 * POST /api/returns/media?order=HZ-…&t=<token>&kind=image|video
 * Body: the raw file. Uploads one photo or video for a return request.
 * Excluded from the proxy (src/proxy.js matcher) so large videos stream to
 * disk instead of being buffered in memory.
 */
const fail = (message, status = 400) => NextResponse.json({ ok: false, message }, { status });

export async function POST(request) {
  // Same-site only: the customer's browser on our own pages.
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  const allowed = new URL(env.NEXT_PUBLIC_APP_URL).origin;
  if ((origin && origin !== allowed) || (site && site !== "same-origin")) return fail("Not allowed.", 403);

  const rl = await rateLimit("returnMedia", LIMITS.returnMedia);
  if (!rl.ok) return fail("Too many uploads. Please wait a while and try again.", 429);

  const sp = request.nextUrl.searchParams;
  const kind = sp.get("kind") === "video" ? "video" : "image";
  const length = Number(request.headers.get("content-length") || 0);
  if (length > (kind === "video" ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES)) {
    return fail(kind === "video" ? "Videos must be 100 MB or smaller." : "Photos must be 15 MB or smaller.", 413);
  }

  const order = await getOrderForViewer(sp.get("order") ?? "", sp.get("t") ?? "");
  if (!order) return fail("We couldn't find this order.", 404);
  const settings = await getStoreSettings();
  const check = returnEligibility(order, settings, await openReturnQuantities(order.id));
  if (!check.eligible) return fail(check.why, 409);
  if ((await countMedia(order.id)) >= MAX_FILES_PER_ORDER) {
    return fail("You've uploaded the maximum number of files for this order.", 409);
  }
  if (!request.body) return fail("No file received.");

  const saved = await saveReturnMedia(order.id, request.body, kind);
  if (saved.error) return fail(saved.error, 422);
  return NextResponse.json({ ok: true, name: saved.name, kind: saved.kind });
}
