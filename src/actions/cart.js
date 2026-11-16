"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCart, getOrCreateCart, MAX_LINE_QTY } from "@/lib/cart";
import { getStoreSettings } from "@/lib/settings";
import { getRelatedProducts } from "@/lib/catalog";
import { rateLimit } from "@/lib/rate-limit";

const CART_LIMIT = { limit: 60, windowSec: 10 * 60 };

const addSchema = z.object({
  variantId: z.string().min(1).max(40),
  quantity: z.coerce.number().int().min(1).max(MAX_LINE_QTY),
});

/** useActionState-compatible: (prevState, formData) → { ok, message } */
export async function addToCart(_prev, formData) {
  const parsed = addSchema.safeParse({ variantId: formData.get("variantId"), quantity: formData.get("quantity") ?? 1 });
  if (!parsed.success) return { ok: false, message: "Please choose a size." };

  const rl = await rateLimit("cart", CART_LIMIT);
  if (!rl.ok) return { ok: false, message: "Too many requests. Please wait a moment." };

  const { variantId, quantity } = parsed.data;
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { stock: true, isActive: true, size: true, product: { select: { status: true, name: true } } },
  });
  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE") {
    return { ok: false, message: "This item is no longer available." };
  }

  const cart = await getOrCreateCart();
  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const nextQty = (existing?.quantity ?? 0) + quantity;
  if (nextQty > variant.stock) {
    return {
      ok: false,
      message: variant.stock > 0 ? `Only ${variant.stock} left in EU ${variant.size}.` : "This size is sold out.",
    };
  }
  if (nextQty > MAX_LINE_QTY) return { ok: false, message: `You can add up to ${MAX_LINE_QTY} of this item.` };

  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    update: { quantity: nextQty },
    create: { cartId: cart.id, variantId, quantity },
  });

  refresh();
  return {
    ok: true,
    variantId,
    at: Date.now(),
    message: `${variant.product.name} (EU ${variant.size}) added to your bag.`,
  };
}

const updateSchema = z.object({
  itemId: z.string().min(1).max(40),
  quantity: z.coerce.number().int().min(0).max(MAX_LINE_QTY),
});

/** Set a line's quantity (0 removes it), scoped to the visitor's own cart. */
async function setLineQuantity(itemId, quantity) {
  const parsed = updateSchema.safeParse({ itemId, quantity });
  if (!parsed.success) return false;

  const rl = await rateLimit("cart", CART_LIMIT);
  if (!rl.ok) return false;

  const cart = await getOrCreateCart();
  // Scope by cartId so a visitor can only modify their own cart lines.
  const item = await db.cartItem.findFirst({
    where: { id: parsed.data.itemId, cartId: cart.id },
    include: { variant: { select: { stock: true } } },
  });
  if (!item) return false;

  if (parsed.data.quantity === 0) {
    await db.cartItem.delete({ where: { id: item.id } });
  } else {
    await db.cartItem.update({
      where: { id: item.id },
      data: { quantity: Math.min(parsed.data.quantity, item.variant.stock, MAX_LINE_QTY) },
    });
  }
  return true;
}

/** Form action: set quantity (0 removes the line). */
export async function updateCartItem(formData) {
  if (await setLineQuantity(formData.get("itemId"), formData.get("quantity"))) refresh();
}

/** Everything the cart drawer shows: lines, totals, free-delivery progress and a few suggestions. */
export async function getCartDrawer() {
  const [cart, settings] = await Promise.all([getCart(), getStoreSettings()]);
  const threshold =
    settings.freeDeliveryEnabled && settings.freeDeliveryThreshold ? Number(settings.freeDeliveryThreshold) : null;
  const inCart = new Set(cart.lines.map((l) => l.slug));
  const related = cart.lines.length ? await getRelatedProducts(cart.lines[cart.lines.length - 1].slug, null) : [];
  return {
    count: cart.count,
    subtotal: cart.subtotal,
    threshold,
    lines: cart.lines.map((l) => ({
      id: l.id,
      variantId: l.variantId,
      slug: l.slug,
      name: l.name,
      size: l.size,
      color: l.color,
      image: l.image ? { url: l.image.url, alt: l.image.alt } : null,
      unitPrice: l.unitPrice,
      compareAt: l.compareAt,
      lineTotal: l.lineTotal,
      quantity: l.quantity,
      maxQty: l.maxQty,
      available: l.available,
      offer: l.offer,
    })),
    suggestions: related
      .filter((p) => !inCart.has(p.slug) && !p.soldOut)
      .slice(0, 3)
      .map((p) => ({ slug: p.slug, name: p.name, subtitle: p.subtitle, price: p.price, compareAt: p.compareAt, image: p.image })),
  };
}

/** Change a line from the drawer and return the fresh drawer contents. */
export async function changeCartLine(itemId, quantity) {
  const changed = await setLineQuantity(itemId, quantity);
  if (changed) refresh();
  return getCartDrawer();
}
