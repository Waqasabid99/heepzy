import "server-only";
import { randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, open, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { uploadRoot } from "@/lib/uploads";
import { listBlobs, putBlob, usingBlob } from "@/lib/storage";

/**
 * Photos and videos customers attach to a return (e.g. an unboxing video of a
 * damaged pair). Stored privately under UPLOAD_DIR/returns/<orderId>/ and only
 * served to staff (src/app/api/returns/media/[orderId]/[name]/route.js).
 *
 *  - Photos are decoded and re-encoded as JPEG (metadata/GPS stripped).
 *  - Videos are streamed to disk with a size cap and accepted only if the file
 *    signature is MP4/MOV (ftyp) or WebM (EBML).
 */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_FILES_PER_ORDER = 30;
export const MAX_PHOTOS = 6;
export const MAX_VIDEOS = 2;

const NAME = /^[a-z0-9]{6,12}-[a-f0-9]{12}\.(jpg|mp4|mov|webm)$/;
const ORDER_ID = /^[a-z0-9]{20,40}$/;
export const VIDEO_TYPES = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" };

export const isMediaName = (n) => NAME.test(String(n));
export const mediaKind = (n) => (String(n).endsWith(".jpg") ? "image" : "video");

function dirFor(orderId) {
  if (!ORDER_ID.test(orderId)) throw new Error("Bad order id");
  return path.join(/* turbopackIgnore: true */ uploadRoot(), "returns", orderId);
}
export function mediaPath(orderId, name) {
  if (!isMediaName(name)) throw new Error("Bad file name");
  return path.join(/* turbopackIgnore: true */ dirFor(orderId), name);
}
const newName = (ext) => `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${ext}`;

// On Vercel Blob: photos only, small enough for a serverless request body (4.5 MB limit).
export const MAX_BLOB_PHOTO_BYTES = 4 * 1024 * 1024;
const blobPrefix = (orderId) => `returns/${orderId}/`;
async function blobNames(orderId) {
  dirFor(orderId); // validates the id
  return (await listBlobs(blobPrefix(orderId))).map((b) => b.pathname.slice(blobPrefix(orderId).length));
}
/** The stored blob (url, size) for a return file, or null. */
export async function findBlob(orderId, name) {
  if (!isMediaName(name)) return null;
  dirFor(orderId);
  const hit = (await listBlobs(`${blobPrefix(orderId)}${name}`)).find((b) => b.pathname === `${blobPrefix(orderId)}${name}`);
  return hit ?? null;
}

export async function countMedia(orderId) {
  if (usingBlob()) return (await blobNames(orderId)).filter((n) => NAME.test(n)).length;
  try {
    return (await readdir(dirFor(orderId))).filter((n) => NAME.test(n)).length;
  } catch {
    return 0;
  }
}

/** Do these names exist for this order? Returns the valid ones. */
export async function existingMedia(orderId, names) {
  if (usingBlob()) {
    const have = new Set(await blobNames(orderId));
    return names.filter((n) => isMediaName(n) && have.has(n));
  }
  const out = [];
  for (const n of names) {
    if (!isMediaName(n)) continue;
    try {
      await stat(mediaPath(orderId, n));
      out.push(n);
    } catch {
      // missing: ignore
    }
  }
  return out;
}

/** Read a web ReadableStream to a temp file, stopping past `max` bytes. Returns { tmp, size } or { error }. */
async function streamToTemp(stream, dir, max) {
  await mkdir(dir, { recursive: true });
  const tmp = path.join(/* turbopackIgnore: true */ dir, `.upload-${randomBytes(8).toString("hex")}`);
  const out = createWriteStream(tmp, { flags: "wx" });
  let size = 0;
  try {
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new Error("TOO_BIG");
      }
      if (!out.write(value)) await new Promise((r) => out.once("drain", r));
    }
    await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
    return { tmp, size };
  } catch (e) {
    out.destroy();
    await unlink(tmp).catch(() => {});
    if (e?.message === "TOO_BIG") return { error: "TOO_BIG" };
    throw e;
  }
}

async function head(file, n = 16) {
  const fh = await open(file, "r");
  try {
    const buf = Buffer.alloc(n);
    await fh.read(buf, 0, n, 0);
    return buf;
  } finally {
    await fh.close();
  }
}

function videoExt(sig) {
  if (sig.subarray(4, 8).toString("latin1") === "ftyp") {
    return sig.subarray(8, 10).toString("latin1") === "qt" ? "mov" : "mp4";
  }
  if (sig[0] === 0x1a && sig[1] === 0x45 && sig[2] === 0xdf && sig[3] === 0xa3) return "webm";
  return null;
}

/**
 * Save one uploaded file for an order. `kind` is "image" or "video" (from the
 * declared type); the bytes decide whether it's accepted.
 * Returns { name, kind } or { error } (customer-facing message).
 */
async function saveReturnMediaToBlob(orderId, stream, kind) {
  if (kind === "video") return { error: "Video upload isn't available here. Please add photos instead." };
  const chunks = [];
  let size = 0;
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BLOB_PHOTO_BYTES) {
      await reader.cancel();
      return { error: "Photos must be 4 MB or smaller." };
    }
    chunks.push(value);
  }
  if (!size) return { error: "That file is empty." };
  let data;
  try {
    data = await sharp(Buffer.concat(chunks), { limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    return { error: "That photo couldn't be read. Please upload a JPG or PNG." };
  }
  dirFor(orderId);
  const name = newName("jpg");
  await putBlob(`${blobPrefix(orderId)}${name}`, data, "image/jpeg");
  return { name, kind: "image" };
}

export async function saveReturnMedia(orderId, stream, kind) {
  if (usingBlob()) return saveReturnMediaToBlob(orderId, stream, kind);
  const dir = dirFor(orderId);
  const max = kind === "video" ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
  const res = await streamToTemp(stream, dir, max);
  if (res.error) {
    return { error: kind === "video" ? "Videos must be 100 MB or smaller." : "Photos must be 15 MB or smaller." };
  }
  const { tmp, size } = res;
  try {
    if (!size) return { error: "That file is empty." };
    if (kind === "video") {
      const ext = videoExt(await head(tmp));
      if (!ext) return { error: "That video format isn't supported. Please upload an MP4 or MOV video." };
      const name = newName(ext);
      await rename(tmp, path.join(/* turbopackIgnore: true */ dir, name));
      return { name, kind: "video" };
    }
    let data;
    try {
      data = await sharp(tmp, { limitInputPixels: 60_000_000 })
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
    } catch {
      return { error: "That photo couldn't be read. Please upload a JPG or PNG." };
    }
    const name = newName("jpg");
    await writeFile(path.join(/* turbopackIgnore: true */ dir, name), data, { flag: "wx" });
    return { name, kind: "image" };
  } finally {
    await unlink(tmp).catch(() => {});
  }
}
