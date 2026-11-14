import "server-only";
import sharp from "sharp";
import { listFiles, MEDIA_PREFIX as PREFIX, newFileName, putFile, uploadRoot as root, usingBlob } from "@/lib/storage";

/** Uploaded files are served by src/app/media/[...path]/route.js at /media/<folder>/<name> (disk), or by Vercel Blob. */
export const MEDIA_PREFIX = PREFIX;
export const uploadRoot = root;
// Vercel rejects request bodies over 4.5 MB, so uploads are capped lower there.
export const maxUploadBytes = () => (usingBlob() ? 4 * 1024 * 1024 : 8 * 1024 * 1024); // before re-encoding
const MAX_PIXELS = 40_000_000; // reject decompression bombs
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif"]);
export const FOLDERS = ["products", "categories", "banners"];

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
  if (file.size > maxUploadBytes()) return { error: `Images must be ${maxUploadBytes() / 1024 / 1024} MB or smaller.` };

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

  const url = await putFile(folder, newFileName("jpg"), data, "image/jpeg");
  return { url, width: info.width, height: info.height };
}

/** Files we stored in `folder`, newest first: [{ url, createdAt }]. */
export async function listUploads(folder = "products", limit = 500) {
  if (!FOLDERS.includes(folder)) return [];
  return listFiles(folder, limit);
}
