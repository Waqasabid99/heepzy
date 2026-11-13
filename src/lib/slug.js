/** URL slug from a name: "Zari Khussa (Red)" → "zari-khussa-red". Safe on client and server. */
export function slugify(s) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}
