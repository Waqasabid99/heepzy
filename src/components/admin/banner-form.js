"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { saveBanner, uploadBannerImage } from "@/actions/admin/banners";
import { Field, FieldError, Toggle, card, field, labelCls } from "@/components/admin/settings-forms";
import { HomeHero, LargeTile, SplitTile } from "@/components/store/home-banners";
import { SLOTS, THEMES } from "@/lib/banner-slots";
import { toPktInput } from "@/lib/pkt";
import { AlertCircle, Upload } from "@/components/ui/icons";

/** Render the real storefront component at desktop width, scaled down to fit the preview box. */
function Scaled({ width, children }) {
  const outer = useRef(null);
  const inner = useRef(null);
  const [box, setBox] = useState({ scale: 0.5, height: 300 });
  useEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const scale = Math.min(1, outer.current.clientWidth / width);
      setBox({ scale, height: inner.current.offsetHeight * scale });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(outer.current);
    ro.observe(inner.current);
    measure();
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={outer} className="overflow-hidden rounded-xl border border-line" style={{ height: box.height }}>
      <div
        ref={inner}
        inert
        className="pointer-events-none origin-top-left"
        style={{ width, transform: `scale(${box.scale})` }}
      >
        {children}
      </div>
    </div>
  );
}

function Preview({ v }) {
  const b = {
    ...v,
    image: v.imageUrl || null,
    endsAt: v.endsAt ? new Date(`${v.endsAt}:00+05:00`).toISOString() : null,
  };
  if (v.placement === "HOME_HERO") {
    return (
      <Scaled width={1366}>
        <HomeHero banner={b} preview />
      </Scaled>
    );
  }
  return (
    <Scaled width={640}>
      <div className="bg-bg p-0">
        {v.placement === "HOME_TILE_1" ? <LargeTile banner={b} /> : <SplitTile banner={b} />}
      </div>
    </Scaled>
  );
}

export function BannerForm({ banner, slot }) {
  const uid = useId();
  const [state, action, pending] = useActionState(saveBanner, null);
  const errors = state?.ok === false ? (state.errors ?? {}) : {};
  const [v, setV] = useState(() => ({
    placement: banner?.placement ?? slot ?? "HOME_HERO",
    name: banner?.name ?? "",
    kicker: banner?.kicker ?? "",
    title: banner?.title ?? "",
    highlight: banner?.highlight ?? "",
    subtitle: banner?.subtitle ?? "",
    imageUrl: banner?.imageUrl ?? "",
    imageAlt: banner?.imageAlt ?? "",
    href: banner?.href ?? "",
    buttonLabel: banner?.buttonLabel ?? "",
    href2: banner?.href2 ?? "",
    button2Label: banner?.button2Label ?? "",
    theme: banner?.theme ?? "crimson",
    showCountdown: banner?.showCountdown ?? false,
    startsAt: toPktInput(banner?.startsAt),
    endsAt: toPktInput(banner?.endsAt),
  }));
  const set = (k) => (e) =>
    setV((x) => ({ ...x, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const hero = v.placement === "HOME_HERO";
  const small = v.placement === "HOME_TILE_2" || v.placement === "HOME_TILE_3";

  const fileRef = useRef(null);
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState(null);
  function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    startUpload(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadBannerImage(fd);
      if (res.ok) setV((x) => ({ ...x, imageUrl: res.url }));
      else setUploadError(res.message);
    });
  }

  useEffect(() => {
    if (state?.ok === false) document.querySelector("[data-banner-error]")?.scrollIntoView({ block: "center" });
  }, [state]);

  const input = (k, props) => ({
    id: `${uid}-${k}`,
    name: k,
    value: v[k],
    onChange: set(k),
    error: errors[k],
    ...props,
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="grid gap-5 xl:grid-cols-[1fr_minmax(0,480px)] xl:items-start"
    >
      {banner ? <input type="hidden" name="id" value={banner.id} /> : null}
      <input type="hidden" name="imageUrl" value={v.imageUrl} />

      <div className="grid gap-5">
        {state?.message && state.ok === false ? (
          <p
            data-banner-error
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-danger-bg p-4 text-sm font-semibold text-sale"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {state.message}
          </p>
        ) : null}

        <section className={card} aria-labelledby={`${uid}-where`}>
          <h2 id={`${uid}-where`} className="font-extrabold">
            Where it goes
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-placement`} className={labelCls}>
                Slot on the home page
              </label>
              <select
                id={`${uid}-placement`}
                name="placement"
                value={v.placement}
                onChange={set("placement")}
                className={field}
              >
                {Object.entries(SLOTS).map(([k, s]) => (
                  <option key={k} value={k}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-fg-muted">{SLOTS[v.placement].hint}</p>
            </div>
            <Field
              {...input("name")}
              label="Name"
              hint="only you see this"
              placeholder="e.g. Eid 2027"
              maxLength={120}
            />
          </div>
        </section>

        <section className={card} aria-labelledby={`${uid}-photo`}>
          <h2 id={`${uid}-photo`} className="font-extrabold">
            Photo
          </h2>
          <div className="mt-4 flex flex-wrap items-start gap-4">
            <div className="relative aspect-video w-48 overflow-hidden rounded-xl border border-line bg-muted">
              {v.imageUrl ? <Image src={v.imageUrl} alt="" fill sizes="192px" className="object-cover" /> : null}
            </div>
            <div className="grid gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                id={`${uid}-file`}
                onChange={onFile}
              />
              <label htmlFor={`${uid}-file`} className="btn-outline min-h-11 cursor-pointer">
                <Upload className="size-4" /> {uploading ? "Uploading…" : v.imageUrl ? "Replace photo" : "Upload photo"}
              </label>
              <p className="text-xs text-fg-muted">JPG, PNG or WebP, up to 8 MB.</p>
              {uploadError ? <FieldError id={`${uid}-up-err`} text={uploadError} /> : null}
              {errors.imageUrl ? <FieldError id={`${uid}-img-err`} text={errors.imageUrl} /> : null}
            </div>
          </div>
          <Field
            {...input("imageAlt")}
            className="mt-4"
            label="Describe the photo"
            hint="for people using screen readers; leave empty if it's only decoration"
            maxLength={200}
          />
        </section>

        <section className={card} aria-labelledby={`${uid}-words`}>
          <h2 id={`${uid}-words`} className="font-extrabold">
            Words
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              {...input("kicker")}
              label="Small heading"
              hint="optional"
              placeholder={hero ? "Blessed Friday" : "Shaadi season"}
              maxLength={80}
            />
            <Field
              {...input("title")}
              label="Heading"
              placeholder={hero ? "Mega" : "Mehndi to walima"}
              maxLength={150}
            />
            {hero ? (
              <Field
                {...input("highlight")}
                label="Highlighted word"
                hint="shown in red after the heading"
                placeholder="Sale"
                maxLength={60}
              />
            ) : null}
            {!small ? (
              <Field
                {...input("subtitle")}
                className={hero ? "" : "sm:col-span-2"}
                label="Line below"
                hint={hero ? "optional; empty shows “Up to X% off” from your offers" : "optional"}
                maxLength={255}
              />
            ) : null}
          </div>
        </section>

        <section className={card} aria-labelledby={`${uid}-btn`}>
          <h2 id={`${uid}-btn`} className="font-extrabold">
            {hero ? "Buttons" : "Button"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              {...input("buttonLabel")}
              label={hero ? "First button" : "Button text"}
              placeholder="Shop now"
              maxLength={40}
            />
            <Field {...input("href")} label="Goes to" placeholder="/offers" maxLength={500} />
            {hero ? (
              <>
                <Field
                  {...input("button2Label")}
                  label="Second button"
                  hint="optional"
                  placeholder="Shop men"
                  maxLength={40}
                />
                <Field {...input("href2")} label="Goes to" placeholder="/products?gender=men" maxLength={500} />
              </>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-fg-muted">
            Use a page on this store, like <span className="font-mono">/offers</span> or{" "}
            <span className="font-mono">/products?category=khussa</span>.
          </p>
          {small ? (
            <fieldset className="mt-4">
              <legend className={labelCls}>Colour</legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(THEMES).map(([k, t]) => (
                  <label
                    key={k}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 has-checked:border-fg has-checked:bg-muted has-focus-visible:outline-2 has-focus-visible:outline-ring"
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={k}
                      checked={v.theme === k}
                      onChange={set("theme")}
                      className="sr-only"
                    />
                    <span aria-hidden="true" className={`size-5 rounded-full ring-1 ring-line ${t.panel}`} />
                    <span className="text-sm font-semibold">{t.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
        </section>

        <section className={card} aria-labelledby={`${uid}-when`}>
          <h2 id={`${uid}-when`} className="font-extrabold">
            When it shows
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field {...input("startsAt")} type="datetime-local" label="Starts" hint="empty = now" />
            <Field {...input("endsAt")} type="datetime-local" label="Ends" hint="empty = no end" />
          </div>
          <p className="mt-2 text-xs text-fg-muted">
            Pakistan time. When it ends, the next banner for this slot (or the standard design) shows.
          </p>
          <div className="mt-4 grid gap-3">
            {hero ? (
              <Toggle
                name="showCountdown"
                title="Show a countdown"
                description="Days, hours, minutes and seconds until it ends."
                defaultChecked={v.showCountdown}
                onChange={set("showCountdown")}
                error={errors.showCountdown}
              />
            ) : null}
            <Toggle
              name="isActive"
              title="Switched on"
              description="Off keeps it saved but never shows it."
              defaultChecked={banner ? banner.isActive : true}
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || uploading} className="btn-ink min-h-11 px-8">
            {pending ? "Saving…" : banner ? "Save banner" : "Add banner"}
          </button>
          <Link href="/admin/content" className="btn-ghost min-h-11">
            Cancel
          </Link>
        </div>
      </div>

      <aside className="xl:sticky xl:top-6" aria-label="Preview">
        <p className="mb-2 text-[13px] font-bold">Preview</p>
        {v.imageUrl || v.title ? (
          <Preview v={v} />
        ) : (
          <p className="rounded-xl border border-dashed border-line px-4 py-16 text-center text-sm text-fg-muted">
            Add a photo and heading to see the preview.
          </p>
        )}
        <p className="mt-2 text-xs text-fg-muted">As it looks on a computer. Phones show the same content stacked.</p>
      </aside>
    </form>
  );
}
