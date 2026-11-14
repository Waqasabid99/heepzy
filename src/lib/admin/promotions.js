import "server-only";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { toPlain } from "@/lib/serialize";

/** Admin offer (automatic promotion) reads. Uncached; every function re-checks the admin role. */
export const OFFER_STATES = ["active", "scheduled", "ended", "off"];

export function offerState(p, now = new Date()) {
  if (!p.isActive) return "off";
  if (p.startsAt && new Date(p.startsAt) > now) return "scheduled";
  if (p.endsAt && new Date(p.endsAt) <= now) return "ended";
  return "active";
}

export function describeOffer(p) {
  const v = Number(p.value);
  return p.type === "PERCENTAGE" ? `${v}% off` : `Rs ${v.toLocaleString("en-PK")} off`;
}

export function parseOfferListParams(sp = {}) {
  const one = (v) => (Array.isArray(v) ? v[0] : v);
  return { state: OFFER_STATES.includes(one(sp.state)) ? one(sp.state) : null };
}

function stateWhere(state, now) {
  if (state === "active") {
    return {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    };
  }
  if (state === "scheduled") return { isActive: true, startsAt: { gt: now } };
  if (state === "ended") return { isActive: true, endsAt: { lte: now } };
  if (state === "off") return { isActive: false };
  return {};
}

export async function listOffers({ state }) {
  await requireStaff();
  const now = new Date();
  const [rows, counts] = await Promise.all([
    db.promotion.findMany({
      where: stateWhere(state, now),
      orderBy: [{ isActive: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: { _count: { select: { products: true, categories: true, brands: true } } },
    }),
    Promise.all([null, ...OFFER_STATES].map((s) => db.promotion.count({ where: stateWhere(s, now) }))),
  ]);
  return {
    counts: Object.fromEntries([null, ...OFFER_STATES].map((s, i) => [s ?? "all", counts[i]])),
    offers: toPlain(rows).map((p) => ({ ...p, state: offerState(p, now), discount: describeOffer(p) })),
  };
}

export async function getOffer(id) {
  await requireStaff();
  if (typeof id !== "string" || id.length > 40) return null;
  const p = await db.promotion.findUnique({
    where: { id },
    include: {
      products: { select: { id: true } },
      categories: { select: { id: true } },
      brands: { select: { id: true } },
    },
  });
  if (!p) return null;
  const plain = toPlain(p);
  return {
    ...plain,
    state: offerState(plain),
    discount: describeOffer(plain),
    productIds: plain.products.map((x) => x.id),
    categoryIds: plain.categories.map((x) => x.id),
    brandIds: plain.brands.map((x) => x.id),
  };
}

/** A unique offer slug based on `base`. */
export async function uniqueOfferSlug(base, excludeId) {
  const root = base || "offer";
  for (let i = 0; i < 50; i += 1) {
    const candidate = i ? `${root}-${i + 1}` : root;
    const hit = await db.promotion.findFirst({
      where: { slug: candidate, NOT: { id: excludeId || undefined } },
      select: { id: true },
    });
    if (!hit) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}
