import "server-only";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

/** Admin inventory reads (uncached, admin-only). One row per product variant (colour × size). */
export const INVENTORY_PAGE_SIZE = 50;
export const HISTORY_PAGE_SIZE = 50;

export const INVENTORY_TABS = [
  { href: "/admin/inventory", label: "Stock levels" },
  { href: "/admin/inventory/history", label: "Movement history" },
];

/** Reasons an admin can pick. SALE / CANCELLATION are recorded by orders automatically. */
export const MANUAL_REASONS = {
  RESTOCK: "Restock (new stock received)",
  ADJUSTMENT: "Stock count correction",
  DAMAGED: "Damaged or lost",
  RETURN: "Customer return",
};
export const REASON_LABELS = {
  ...MANUAL_REASONS,
  SALE: "Sold (order)",
  CANCELLATION: "Order cancelled",
};

const one = (v) => (Array.isArray(v) ? v[0] : v);
const pageOf = (v) => Math.max(1, Math.min(Number.parseInt(one(v), 10) || 1, 1000));

export function parseInventoryParams(sp = {}) {
  return {
    q: (one(sp.q) ?? "").toString().trim().slice(0, 100),
    stock: ["low", "out", "in"].includes(one(sp.stock)) ? one(sp.stock) : null,
    category: /^[a-z0-9-]{1,140}$/.test(one(sp.category) ?? "") ? one(sp.category) : null,
    sort: ["product", "stock-asc", "stock-desc"].includes(one(sp.sort)) ? one(sp.sort) : "product",
    page: pageOf(sp.page),
  };
}

async function lowThreshold() {
  const s = await db.storeSettings.findUnique({ where: { id: 1 }, select: { lowStockThreshold: true } });
  return s?.lowStockThreshold ?? 5;
}

const baseWhere = { isActive: true, product: { deletedAt: null } };

export async function getInventoryStats() {
  await requireAdmin();
  const low = await lowThreshold();
  const rows = await db.productVariant.findMany({
    where: baseWhere,
    select: {
      stock: true,
      price: true,
      lowStockThreshold: true,
      product: { select: { basePrice: true, costPrice: true } },
    },
  });
  let units = 0;
  let retail = 0;
  let cost = 0;
  let hasCost = false;
  let lowCount = 0;
  let outCount = 0;
  for (const r of rows) {
    units += r.stock;
    retail += r.stock * Number(r.price ?? r.product.basePrice);
    if (r.product.costPrice != null) {
      hasCost = true;
      cost += r.stock * Number(r.product.costPrice);
    }
    if (r.stock <= 0) outCount += 1;
    else if (r.stock <= (r.lowStockThreshold ?? low)) lowCount += 1;
  }
  return { variants: rows.length, units, retail, cost: hasCost ? cost : null, lowCount, outCount, low };
}

export async function listInventory({ q, stock, category, sort, page }) {
  await requireAdmin();
  const low = await lowThreshold();
  const where = {
    ...baseWhere,
    product: {
      deletedAt: null,
      ...(category ? { categories: { some: { slug: category } } } : {}),
    },
    ...(q
      ? { OR: [{ sku: { contains: q } }, { product: { name: { contains: q } } }, { color: { contains: q } }] }
      : {}),
    ...(stock === "out" ? { stock: { lte: 0 } } : {}),
    ...(stock === "low" ? { stock: { gt: 0, lte: low } } : {}),
    ...(stock === "in" ? { stock: { gt: low } } : {}),
  };
  const orderBy =
    sort === "stock-asc"
      ? [{ stock: "asc" }, { id: "asc" }]
      : sort === "stock-desc"
        ? [{ stock: "desc" }, { id: "asc" }]
        : [{ product: { name: "asc" } }, { color: "asc" }, { size: "asc" }, { id: "asc" }];

  const [total, rows] = await Promise.all([
    db.productVariant.count({ where }),
    db.productVariant.findMany({
      where,
      orderBy,
      skip: (page - 1) * INVENTORY_PAGE_SIZE,
      take: INVENTORY_PAGE_SIZE,
      select: {
        id: true,
        sku: true,
        color: true,
        colorHex: true,
        size: true,
        stock: true,
        lowStockThreshold: true,
        updatedAt: true,
        product: {
          select: {
            id: true,
            name: true,
            status: true,
            images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
          },
        },
      },
    }),
  ]);

  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / INVENTORY_PAGE_SIZE)),
    low,
    rows: rows.map((r) => {
      const threshold = r.lowStockThreshold ?? low;
      return {
        id: r.id,
        sku: r.sku,
        color: r.color,
        colorHex: r.colorHex,
        size: r.size,
        stock: r.stock,
        level: r.stock <= 0 ? "out" : r.stock <= threshold ? "low" : "in",
        productId: r.product.id,
        productName: r.product.name,
        productStatus: r.product.status,
        image: r.product.images[0]?.url ?? null,
      };
    }),
  };
}

export function parseHistoryParams(sp = {}) {
  const reason = one(sp.reason);
  return {
    variant: /^[a-z0-9]{10,40}$/.test(one(sp.variant) ?? "") ? one(sp.variant) : null,
    reason: REASON_LABELS[reason] ? reason : null,
    page: pageOf(sp.page),
  };
}

export async function listMovements({ variant, reason, page }) {
  await requireAdmin();
  const where = { ...(variant ? { variantId: variant } : {}), ...(reason ? { reason } : {}) };
  const [total, rows, focus] = await Promise.all([
    db.inventoryMovement.count({ where }),
    db.inventoryMovement.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * HISTORY_PAGE_SIZE,
      take: HISTORY_PAGE_SIZE,
      select: {
        id: true,
        change: true,
        stockAfter: true,
        reason: true,
        note: true,
        orderId: true,
        actorId: true,
        createdAt: true,
        variant: {
          select: {
            id: true,
            sku: true,
            color: true,
            size: true,
            stock: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
    }),
    variant
      ? db.productVariant.findUnique({
          where: { id: variant },
          select: { sku: true, color: true, size: true, stock: true, product: { select: { id: true, name: true } } },
        })
      : null,
  ]);

  const actorIds = [...new Set(rows.map((r) => r.actorId).filter(Boolean))];
  const actors = actorIds.length
    ? await db.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, email: true } })
    : [];
  const actorName = new Map(actors.map((a) => [a.id, a.name || a.email]));

  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE)),
    focus,
    rows: rows.map((r) => ({
      id: r.id,
      change: r.change,
      stockAfter: r.stockAfter,
      reason: r.reason,
      note: r.note,
      orderId: r.orderId,
      actor: r.actorId ? (actorName.get(r.actorId) ?? "Deleted user") : "System",
      createdAt: r.createdAt.toISOString(),
      variantId: r.variant.id,
      sku: r.variant.sku,
      color: r.variant.color,
      size: r.variant.size,
      productId: r.variant.product.id,
      productName: r.variant.product.name,
    })),
  };
}
