import { readFile } from "node:fs/promises";
import path from "node:path";
import { FOLDERS, uploadRoot } from "@/lib/uploads";

// Only files we wrote ourselves: <folder>/<base36 time>-<hex>.jpg
const NAME = /^[a-z0-9]{6,12}-[a-f0-9]{12}\.jpg$/;

/** Serves uploaded images from UPLOAD_DIR (see src/lib/uploads.js). */
export async function GET(_request, { params }) {
  const segments = (await params).path ?? [];
  if (segments.length !== 2) return new Response("Not found", { status: 404 });
  const [folder, name] = segments;
  if (!FOLDERS.includes(folder) || !NAME.test(name)) return new Response("Not found", { status: 404 });

  try {
    const file = await readFile(path.join(/* turbopackIgnore: true */ uploadRoot(), folder, name));
    return new Response(file, {
      headers: {
        "Content-Type": "image/jpeg",
        // Names are unique and files are never overwritten.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
