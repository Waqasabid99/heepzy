import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { env } from "@/lib/env";

/** Uploaded files are served by src/app/media/[...path]/route.js at /media/<folder>/<name>. */
export const MEDIA_PREFIX = "/media";
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // before re-encoding
const MAX_PIXELS = 40_000_000; // reject decompression bombs
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif"]);
export const FOLDERS = ["products", "categories", "banners"];

/** Runtime-only path: excluded from Turbopack's file tracing (it is user data, not app code). */
export function uploadRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), env.UPLOAD_DIR);
}

/**
 * Validate and re-encode an uploaded image. The original bytes are never
 * stored: sharp decodes the image, auto-rotates it, strips all metadata
 * (EXIF/GPS) and writes a fresh JPEG — so disguised files can't slip through.
 * Returns the public URL plus dimensions.
 */
export async function saveImage(file, { folder = "products", maxSize = 1600 } = {}) {
  if (!FOLDERS.includes(folder)) throw new Error("Invalid upload folder");
  if (!file || typeof file.arrayBuffer !== "function") return { error: "Choose an image to upload." };
  if (file.size === 0) return { error: "That file is empty." };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "Images must be 8 MB or smaller." };

  const input = Buffer.from(await file.arrayBuffer());
  let meta;
  try {
    meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
  } catch {
    return { error: "That file isn't a supported image (JPG, PNG, WebP or AVIF)." };
  }
  if (!ALLOWED_FORMATS.has(meta.format)) {
    return { error: "That file isn't a supported image (JPG, PNG, WebP or AVIF)." };
  }

  const { data, info } = await sharp(input, { limitInputPixels: MAX_PIXELS })
    .rotate()
    .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 82, mozjpeg: true, progressive: true })
    .toBuffer({ resolveWithObject: true });

  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.jpg`;
  const dir = path.join(/* turbopackIgnore: true */ uploadRoot(), folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ dir, name), data, { flag: "wx" });

  return { url: `${MEDIA_PREFIX}/${folder}/${name}`, width: info.width, height: info.height };
}

const STORED_NAME = /^[a-z0-9]{6,12}-[a-f0-9]{12}\.jpg$/;

/** Files we stored in `folder`, newest first: [{ url, createdAt }]. */
export async function listUploads(folder = "products", limit = 500) {
  if (!FOLDERS.includes(folder)) return [];
  const dir = path.join(/* turbopackIgnore: true */ uploadRoot(), folder);
  let names;
  try {
    names = (await readdir(dir)).filter((n) => STORED_NAME.test(n));
  } catch {
    return [];
  }
  const files = await Promise.all(
    names.map(async (name) => {
      const info = await stat(path.join(/* turbopackIgnore: true */ dir, name));
      return { url: `${MEDIA_PREFIX}/${folder}/${name}`, createdAt: info.mtime.toISOString() };
    }),
  );
  return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
