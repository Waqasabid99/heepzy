import "server-only";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/session";
import { fromPktInput } from "@/lib/pkt";

/** Owner-only record of admin (and some customer/system) actions. */
export const AUDIT_PAGE_SIZE = 50;

export const AREAS = {
  orders: { label: "Orders", entities: ["Order"] },
  returns: { label: "Returns", entities: ["ReturnRequest"] },
  products: { label: "Products & stock", entities: ["Product", "ProductVariant"] },
  customers: { label: "Customers & staff", entities: ["User"] },
  marketing: { label: "Offers & vouchers", entities: ["Promotion", "Coupon"] },
  content: { label: "Reviews & banners", entities: ["Review", "Banner"] },
  settings: { label: "Settings", entities: ["StoreSettings", "TaxRate", "DeliveryZone", "PaymentGateway"] },
};

const VERBS = {
  "order.create": "Created order",
  "order.status": "Changed order status",
  "order.cancel": "Cancelled order",
  "order.refund": "Recorded a refund",
  "order.note": "Edited order note",
  "order.link": "Linked order to a customer",
  "payment.completed": "Card payment confirmed",
  "payment.mismatch": "Card payment amount didn't match",
  "return.request": "Requested a return",
  "return.cancel": "Withdrew a return request",
  "return.approve": "Approved return",
  "return.reject": "Rejected return",
  "return.receive": "Received returned shoes",
  "return.refund": "Refunded return",
  "return.complete": "Completed return",
  "return.note": "Edited return note",
  "product.create": "Added product",
  "product.update": "Edited product",
  "product.status": "Changed product status",
  "product.delete": "Deleted product",
  "inventory.adjust": "Adjusted stock",
  "customer.create": "Added customer",
  "customer.ban": "Blocked customer",
  "customer.unban": "Unblocked customer",
  "user.role": "Changed role",
  "coupon.create": "Created voucher",
  "coupon.update": "Edited voucher",
  "coupon.enable": "Switched voucher on",
  "coupon.disable": "Switched voucher off",
  "coupon.delete": "Deleted voucher",
  "offer.create": "Created offer",
  "offer.update": "Edited offer",
  "offer.enable": "Switched offer on",
  "offer.disable": "Switched offer off",
  "offer.delete": "Deleted offer",
  "review.approve": "Approved review",
  "review.reject": "Rejected review",
  "review.reply": "Replied to review",
  "review.delete": "Deleted review",
  "banner.create": "Added banner",
  "banner.update": "Edited banner",
  "banner.delete": "Deleted banner",
  "banner.enable": "Switched banner on",
  "banner.disable": "Switched banner off",
  "settings.store": "Edited store details",
  "settings.payments": "Edited payment methods",
  "settings.returns": "Edited returns policy",
  "settings.tax": "Edited tax settings",
  "settings.delivery": "Edited free delivery",
  "settings.payment_keys.add": "Added payment keys",
  "settings.payment_keys.update": "Changed payment keys",
  "settings.payment_keys.remove": "Removed payment keys",
  "tax.create": "Added tax rate",
  "tax.update": "Edited tax rate",
  "tax.delete": "Deleted tax rate",
  "delivery.zone.create": "Added delivery zone",
  "delivery.zone.update": "Edited delivery zone",
  "delivery.zone.delete": "Deleted delivery zone",
};

export function describeAction(action) {
  if (VERBS[action]) return VERBS[action];
  const s = action.replace(/[._]/g, " ");
  return s[0].toUpperCase() + s.slice(1);
}

/** Where an entry's subject lives in the admin (or null). */
export function entityHref(entity, id) {
  if (!id) return null;
  const e = encodeURIComponent(id);
  switch (entity) {
    case "Order":
      return `/admin/orders/${e}`;
    case "ReturnRequest":
      return `/admin/returns/${e}`;
    case "Product":
      return `/admin/products/${e}`;
    case "User":
      return `/admin/customers/${e}`;
    case "Coupon":
      return `/admin/coupons/${e}`;
    case "Promotion":
      return `/admin/promotions/${e}`;
    case "Banner":
      return `/admin/content/${e}`;
    case "Review":
      return "/admin/reviews?status=all";
    case "StoreSettings":
      return "/admin/settings";
    case "PaymentGateway":
      return "/admin/settings/payments";
    case "TaxRate":
      return "/admin/settings/tax";
    case "DeliveryZone":
      return "/admin/settings/delivery";
    default:
      return null;
  }
}

const one = (v) => (Array.isArray(v) ? v[0] : v);

export function parseAuditParams(sp = {}) {
  const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(one(v) ?? "") ? one(v) : "");
  return {
    area: Object.hasOwn(AREAS, one(sp.area)) ? one(sp.area) : null,
    actor: /^[A-Za-z0-9_-]{1,64}$/.test(one(sp.actor) ?? "") ? one(sp.actor) : null,
    q: (one(sp.q) ?? "").toString().trim().slice(0, 80),
    from: day(sp.from),
    to: day(sp.to),
    page: Math.max(1, Math.min(Number.parseInt(one(sp.page), 10) || 1, 1000)),
  };
}

/** Never show anything that looks like a secret, even if one slipped into metadata. */
function redact(v) {
  if (Array.isArray(v)) return v.map(redact);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, /secret|password|token|key$/i.test(k) ? "(hidden)" : redact(x)]),
    );
  }
  return v;
}

export async function listAuditLog({ area, actor, q, from, to, page }) {
  await requireOwner();
  const where = {};
  if (area) where.entity = { in: AREAS[area].entities };
  if (actor) where.actorId = actor;
  if (q) {
    where.OR = [{ entityId: q }, { action: { contains: q } }, { ipAddress: q }];
  }
  const start = from ? fromPktInput(`${from}T00:00`) : null;
  const end = to ? fromPktInput(`${to}T00:00`) : null;
  if (start || end) {
    where.createdAt = {
      ...(start ? { gte: start } : {}),
      ...(end ? { lt: new Date(end.getTime() + 86_400_000) } : {}),
    };
  }

  const [total, rows, staff] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
    }),
    db.user.findMany({
      where: { role: { in: ["admin", "manager"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Show order numbers / RMA numbers instead of raw ids where we can.
  const ids = (entity) => [...new Set(rows.filter((r) => r.entity === entity && r.entityId).map((r) => r.entityId))];
  const [orders, returns, products] = await Promise.all([
    db.order.findMany({ where: { id: { in: ids("Order") } }, select: { id: true, orderNumber: true } }),
    db.returnRequest.findMany({ where: { id: { in: ids("ReturnRequest") } }, select: { id: true, rmaNumber: true } }),
    db.product.findMany({ where: { id: { in: ids("Product") } }, select: { id: true, name: true } }),
  ]);
  const names = new Map([
    ...orders.map((o) => [o.id, o.orderNumber]),
    ...returns.map((r) => [r.id, r.rmaNumber]),
    ...products.map((p) => [p.id, p.name]),
  ]);

  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE)),
    staff,
    entries: rows.map((r) => ({
      id: r.id,
      at: r.createdAt.toISOString(),
      action: r.action,
      what: describeAction(r.action),
      entity: r.entity,
      entityId: r.entityId,
      subject: (r.entityId && names.get(r.entityId)) ?? null,
      href: entityHref(r.entity, r.entityId),
      metadata: r.metadata ? redact(r.metadata) : null,
      ip: r.ipAddress,
      actor: r.actor ? { id: r.actor.id, name: r.actor.name || r.actor.email, role: r.actor.role } : null,
    })),
  };
}
