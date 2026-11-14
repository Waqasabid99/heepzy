import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getCurrentUser } from "@/lib/session";
import { isStaff } from "@/lib/roles";
import { isMediaName, mediaPath, VIDEO_TYPES } from "@/lib/return-media";

/**
 * GET /api/returns/media/<orderId>/<name> — a customer's return photo/video.
 * Staff only. Supports Range requests so videos can be scrubbed (and play on Safari).
 */
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user || !isStaff(user.role)) return new Response("Forbidden", { status: 403 });
  const { orderId, name } = await params;
  if (!isMediaName(name)) return new Response("Not found", { status: 404 });

  let file;
  let size;
  try {
    file = mediaPath(orderId, name);
    size = (await stat(file)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const ext = name.split(".").pop();
  const headers = {
    "Content-Type": ext === "jpg" ? "image/jpeg" : VIDEO_TYPES[ext],
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
    "Accept-Ranges": "bytes",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    return new Response(Readable.toWeb(createReadStream(file, { start, end })), {
      status: 206,
      headers: {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }
  return new Response(Readable.toWeb(createReadStream(file)), {
    headers: { ...headers, "Content-Length": String(size) },
  });
}
