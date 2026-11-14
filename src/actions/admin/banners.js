"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/audit";
import { fromPktInput } from "@/lib/pkt";
import { saveImage } from "@/lib/uploads";
import { BANNERS_TAG } from "@/lib/banners";
import { SLOTS, THEMES } from "@/lib/banner-slots";

/** Admin → Banners: the home page hero and campaign tiles. */

const when = z
  .string()
  .default("")
  .refine((v) => v === "" || fromPktInput(v), "Enter a valid date and time")
  .transform((v) => fromPktInput(v));
const text = (max, msg) =>
  z
    .string()
    .trim()
    .max(max, msg ?? `Keep it under ${max} characters`)
    .transform((v) => v || null);
// A page on this site ("/offers", "/products?category=khussa", "#newsletter") or a full https link.
const link = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^(\/(?!\/)|#)[^\s]*$/.test(v) || /^https:\/\/[^\s]+$/.test(v), {
    message: "Use a page on this site like /offers, or a full https:// link",
  })
  .transform((v) => v || null);

const schema = z
  .object({
    id: z.union([z.literal(""), z.string().min(10).max(40)]).default(""),
    placement: z.enum(Object.keys(SLOTS), { error: "Choose where it goes" }),
    name: z.string().trim().max(120).default(""),
    kicker: text(80),
    title: z.string().trim().min(1, "Add a heading").max(150, "Keep it under 150 characters"),
    highlight: text(60),
    subtitle: text(255),
    imageUrl: z
      .string()
      .trim()
      .regex(/^\/(media|images)\/[\w./-]+$/, "Add a photo"),
    imageAlt: z.string().trim().max(200).default(""),
    href: link,
    buttonLabel: text(40),
    href2: link,
    button2Label: text(40),
    theme: z.enum(Object.keys(THEMES)).default("crimson"),
    showCountdown: z.boolean(),
    isActive: z.boolean(),
    startsAt: when,
    endsAt: when,
  })
  .superRefine((b, ctx) => {
    if (b.startsAt && b.endsAt && b.endsAt <= b.startsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Must be after the start" });
    }
    if (b.showCountdown && !b.endsAt) {
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "Set an end time for the countdown" });
    }
    if (b.placement !== "HOME_HERO" && !b.href) {
      ctx.addIssue({ code: "custom", path: ["href"], message: "Where should the tile go when tapped?" });
    }
  });

function done() {
  updateTag(BANNERS_TAG);
  refresh();
}

export async function saveBanner(_prev, formData) {
  const admin = await requireStaff();
  const t = (k) => String(formData.get(k) ?? "");
  const parsed = schema.safeParse({
    id: t("id"),
    placement: t("placement"),
    name: t("name"),
    kicker: t("kicker"),
    title: t("title"),
    highlight: t("highlight"),
    subtitle: t("subtitle"),
    imageUrl: t("imageUrl"),
    imageAlt: t("imageAlt"),
    href: t("href"),
    buttonLabel: t("buttonLabel"),
    href2: t("href2"),
    button2Label: t("button2Label"),
    theme: t("theme") || "crimson",
    showCountdown: formData.get("showCountdown") === "on",
    isActive: formData.get("isActive") === "on",
    startsAt: t("startsAt"),
    endsAt: t("endsAt"),
  });
  if (!parsed.success) {
    const errors = {};
    for (const i of parsed.error.issues) errors[i.path[0] ?? "form"] ??= i.message;
    return { ok: false, errors, message: "Please fix the highlighted fields." };
  }
  const { id, ...data } = parsed.data;
  // Only the hero has a highlight word, second button and countdown; only small tiles have a colour.
  if (data.placement !== "HOME_HERO")
    Object.assign(data, { highlight: null, href2: null, button2Label: null, showCountdown: false });
  if (!["HOME_TILE_2", "HOME_TILE_3"].includes(data.placement)) data.theme = "crimson";
  data.name = data.name || data.title;

  let saved;
  if (id) {
    const existing = await db.banner.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return { ok: false, message: "This banner no longer exists." };
    saved = await db.banner.update({ where: { id }, data, select: { id: true } });
  } else {
    saved = await db.banner.create({ data, select: { id: true } });
  }
  await audit({
    actorId: admin.id,
    action: id ? "banner.update" : "banner.create",
    entity: "Banner",
    entityId: saved.id,
    metadata: { slot: SLOTS[data.placement].label, title: data.title, live: data.isActive },
  });
  done();
  redirect(`/admin/content?saved=${saved.id}`);
}

export async function setBannerActive(id, isActive) {
  const admin = await requireStaff();
  if (!z.string().min(10).max(40).safeParse(id).success) return { ok: false, message: "Banner not found." };
  const res = await db.banner.updateMany({ where: { id }, data: { isActive: Boolean(isActive) } });
  if (!res.count) return { ok: false, message: "Banner not found." };
  await audit({
    actorId: admin.id,
    action: isActive ? "banner.enable" : "banner.disable",
    entity: "Banner",
    entityId: id,
  });
  done();
  return { ok: true };
}

export async function deleteBanner(id) {
  const admin = await requireStaff();
  if (!z.string().min(10).max(40).safeParse(id).success) return { ok: false, message: "Banner not found." };
  const b = await db.banner.findUnique({ where: { id }, select: { title: true } });
  if (!b) return { ok: false, message: "Banner not found." };
  await db.banner.delete({ where: { id } });
  await audit({
    actorId: admin.id,
    action: "banner.delete",
    entity: "Banner",
    entityId: id,
    metadata: { title: b.title },
  });
  done();
  return { ok: true };
}

/** Upload a banner photo (kept larger than product photos: the hero is full width). */
export async function uploadBannerImage(formData) {
  await requireStaff();
  const res = await saveImage(formData.get("file"), { folder: "banners", maxSize: 2400 });
  if (res.error) return { ok: false, message: res.error };
  return { ok: true, url: res.url };
}
