"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertCircle, Close, Upload } from "@/components/ui/icons";

const MAX_PHOTOS = 6;
const MAX_VIDEOS = 2;
const MAX_PHOTO_MB = 15;
const MAX_VIDEO_MB = 100;

/** Upload one file with progress (fetch can't report upload progress). */
function upload(url, file, onProgress) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        resolve({ ok: false, message: "Upload failed. Please try again." });
      }
    };
    xhr.onerror = () => resolve({ ok: false, message: "Upload failed. Check your connection and try again." });
    xhr.send(file);
  });
}

/**
 * Photos and videos for a return. Files upload straight away; `onChange`
 * receives the stored names of finished uploads.
 */
export function ReturnMediaUploader({ orderNumber, token, onChange, required, error, errorId }) {
  const uid = useId();
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]); // { key, kind, label, preview, status, progress, name, message }

  const update = (key, patch) => setFiles((list) => list.map((f) => (f.key === key ? { ...f, ...patch } : f)));

  // Tell the form which uploads have finished.
  const doneKey = files
    .filter((f) => f.status === "done")
    .map((f) => f.name)
    .join(",");
  useEffect(() => {
    onChange(doneKey ? doneKey.split(",") : []);
  }, [doneKey, onChange]);

  // Free preview URLs when the form goes away.
  const previews = useRef([]);
  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function add(list) {
    const photos = files.filter((f) => f.kind === "image" && f.status !== "error").length;
    const videos = files.filter((f) => f.kind === "video" && f.status !== "error").length;
    let p = photos;
    let v = videos;
    const added = [];
    for (const file of list) {
      const kind = file.type.startsWith("video/") ? "video" : "image";
      const key = crypto.randomUUID();
      const base = { key, kind, label: file.name, progress: 0 };
      if (kind === "image" ? p >= MAX_PHOTOS : v >= MAX_VIDEOS) {
        added.push({
          ...base,
          status: "error",
          message: kind === "image" ? `Up to ${MAX_PHOTOS} photos` : `Up to ${MAX_VIDEOS} videos`,
        });
        continue;
      }
      if (file.size > (kind === "image" ? MAX_PHOTO_MB : MAX_VIDEO_MB) * 1024 * 1024) {
        added.push({
          ...base,
          status: "error",
          message:
            kind === "image" ? `Photos must be under ${MAX_PHOTO_MB} MB` : `Videos must be under ${MAX_VIDEO_MB} MB`,
        });
        continue;
      }
      if (kind === "image") p += 1;
      else v += 1;
      const preview = URL.createObjectURL(file);
      previews.current.push(preview);
      added.push({ ...base, preview, status: "uploading", file });
    }
    setFiles((l) => [...l, ...added.map(({ file: _f, ...rest }) => rest)]);
    const q = `order=${encodeURIComponent(orderNumber)}${token ? `&t=${encodeURIComponent(token)}` : ""}`;
    for (const a of added.filter((x) => x.status === "uploading")) {
      upload(`/api/returns/media?${q}&kind=${a.kind}`, a.file, (progress) => update(a.key, { progress })).then((res) =>
        update(
          a.key,
          res.ok ? { status: "done", name: res.name, progress: 100 } : { status: "error", message: res.message },
        ),
      );
    }
  }

  const remove = (key) => setFiles((list) => list.filter((f) => f.key !== key));
  const busy = files.some((f) => f.status === "uploading");

  return (
    <fieldset aria-describedby={error ? errorId : `${uid}-hint`}>
      <legend className="mb-1 text-lg font-extrabold">
        Photos and video{" "}
        <span className="text-sm font-normal text-fg-muted">
          {required ? "· required for this reason" : "· optional"}
        </span>
      </legend>
      <p id={`${uid}-hint`} className="mb-3 text-[13px] text-fg-muted">
        Show the shoes, the box and any damage. If you recorded an unboxing video, add it here. Up to {MAX_PHOTOS}{" "}
        photos and {MAX_VIDEOS} videos ({MAX_VIDEO_MB} MB each).
      </p>

      {files.length ? (
        <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((f) => (
            <li key={f.key} className="relative aspect-square overflow-hidden rounded-xl border border-line bg-muted">
              {f.preview && f.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- local preview of the customer's own file
                <img src={f.preview} alt="" className="size-full object-cover" />
              ) : f.preview ? (
                <video src={f.preview} muted playsInline className="size-full object-cover" aria-hidden="true" />
              ) : null}
              <span className="absolute inset-x-0 bottom-0 bg-fg/75 px-2 py-1 text-[11px] font-semibold text-bg">
                {f.status === "uploading"
                  ? `Uploading ${f.progress}%`
                  : f.status === "done"
                    ? f.kind === "video"
                      ? "Video added"
                      : "Photo added"
                    : f.message}
                <span className="sr-only"> ({f.label})</span>
              </span>
              {f.status === "uploading" ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 bg-accent transition-[width]"
                  style={{ width: `${f.progress}%` }}
                />
              ) : null}
              <button
                type="button"
                onClick={() => remove(f.key)}
                aria-label={`Remove ${f.label}`}
                className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-surface/90 shadow"
              >
                <Close className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        ref={inputRef}
        id={`${uid}-files`}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm"
        multiple
        className="sr-only"
        onChange={(e) => {
          add([...(e.target.files ?? [])]);
          e.target.value = "";
        }}
      />
      <label htmlFor={`${uid}-files`} className="btn-outline min-h-12 cursor-pointer">
        <Upload className="size-4" /> Add photos or video
      </label>
      {busy ? (
        <p role="status" className="mt-2 text-[13px] text-fg-muted">
          Uploading… keep this page open.
        </p>
      ) : null}
      {error ? (
        <p id={errorId} data-error className="mt-2 flex items-start gap-1.5 text-[13px] font-semibold text-sale">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
