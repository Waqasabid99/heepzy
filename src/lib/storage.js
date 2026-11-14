import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, list, put } from "@vercel/blob";
import { env } from "@/lib/env";

/**
 * Where uploaded files live. One switch, two backends:
 *
 *  - disk (default): files under UPLOAD_DIR, served by /media/* (Hostinger, VPS, local).
 *  - blob: Vercel Blob (set BLOB_READ_WRITE_TOKEN, or STORAGE_DRIVER=blob).
 *
 * `STORAGE_DRIVER=auto` picks blob when the token is present, otherwise disk.
 */
export const MEDIA_PREFIX = "/media";

export function storageDriver() {
  if (env.STORAGE_DRIVER === "disk") return "disk";
  if (env.STORAGE_DRIVER === "blob") {
    if (!env.BLOB_READ_WRITE_TOKEN) throw new Error("STORAGE_DRIVER=blob needs BLOB_READ_WRITE_TOKEN");
    return "blob";
  }
  return env.BLOB_READ_WRITE_TOKEN ? "blob" : "disk";
}
export const usingBlob = () => storageDriver() === "blob";

/** Runtime-only path: excluded from Turbopack's file tracing (it is user data, not app code). */
export function uploadRoot() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), env.UPLOAD_DIR);
}

export const newFileName = (ext = "jpg") => `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.${ext}`;
const STORED_NAME = /^[a-z0-9]{6,12}-[a-f0-9]{12}\.jpg$/;

const blobOpts = { token: env.BLOB_READ_WRITE_TOKEN, access: "public" };

/**
 * Store a file under `<folder>/<name>`. Names are unique and never overwritten.
 * Returns the public URL: `/media/<folder>/<name>` on disk, the blob URL on Vercel Blob.
 */
export async function putFile(folder, name, data, contentType = "image/jpeg") {
  if (usingBlob()) {
    const res = await put(`${folder}/${name}`, data, {
      ...blobOpts,
      contentType,
      addRandomSuffix: false,
      cacheControlMaxAge: 31536000,
    });
    return res.url;
  }
  const dir = path.join(/* turbopackIgnore: true */ uploadRoot(), folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ dir, name), data, { flag: "wx" });
  return `${MEDIA_PREFIX}/${folder}/${name}`;
}

/** Files we stored in `folder`, newest first: [{ url, createdAt }]. */
export async function listFiles(folder, limit = 500) {
  if (usingBlob()) {
    const out = [];
    let cursor;
    do {
      const page = await list({ token: env.BLOB_READ_WRITE_TOKEN, prefix: `${folder}/`, cursor, limit: 1000 });
      for (const b of page.blobs) {
        if (STORED_NAME.test(b.pathname.slice(folder.length + 1))) {
          out.push({ url: b.url, createdAt: new Date(b.uploadedAt).toISOString() });
        }
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor && out.length < limit);
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }
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

/** Blobs under a path prefix (Vercel Blob only): [{ pathname, url, size }]. */
export async function listBlobs(prefix) {
  const res = await list({ token: env.BLOB_READ_WRITE_TOKEN, prefix, limit: 1000 });
  return res.blobs;
}

export async function putBlob(pathname, data, contentType) {
  const res = await put(pathname, data, { ...blobOpts, contentType, addRandomSuffix: false });
  return res.url;
}

export async function deleteBlobs(urls) {
  await del(urls, { token: env.BLOB_READ_WRITE_TOKEN });
}
