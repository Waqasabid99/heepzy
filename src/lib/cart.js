import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { CART_COOKIE, cartCookieOptions, createCartToken, verifyCartCookie } from "@/lib/cart-token";

export const MAX_LINE_QTY = 10;

const itemInclude = {
  variant: {
    select: {
      id: true,
      size: true,
      color: true,
      stock: true,
      price: true,
      isActive: true,
      product: {
        select: {
          slug: true,
          name: true,
          basePrice: true,
          compareAtPrice: true,
          status: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true, alt: true } },
        },
      },
    },
  },
};

async function readGuestToken() {
  return verifyCartCookie((await cookies()).get(CART_COOKIE)?.value);
}

/** Find the current visitor's cart (read-only; never creates or sets cookies). */
async function findCart() {
  const user = await getCurrentUser();
  if (user) {
    const cart = await db.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: itemInclude, orderBy: { createdAt: "asc" } } },
    });
    if (cart) return cart;
  }
  const token = await readGuestToken();
  if (!token) return null;
  return db.cart.findUnique({
    where: { guestToken: token },
    include: { items: { include: itemInclude, orderBy: { createdAt: "asc" } } },
  });
}

/** Client-safe cart view model with computed totals. */
export async function getCart() {
  const cart = await findCart();
  const lines = (cart?.items ?? []).map((i) => {
    const v = i.variant;
    const unit = Number(v.price ?? v.product.basePrice);
    const available = v.isActive && v.product.status === "ACTIVE" && v.stock > 0;
    return {
      id: i.id,
      variantId: v.id,
      slug: v.product.slug,
      name: v.product.name,
      size: v.size,
      color: v.color,
      image: v.product.images[0] ?? null,
      unitPrice: unit,
      compareAt: v.product.compareAtPrice ? Number(v.product.compareAtPrice) : null,
      quantity: i.quantity,
      maxQty: Math.min(MAX_LINE_QTY, v.stock),
      available,
      lineTotal: unit * i.quantity,
    };
  });
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = lines.filter((l) => l.available).reduce((n, l) => n + l.lineTotal, 0);
  return { id: cart?.id ?? null, lines, count, subtotal };
}

export async function getCartCount() {
  const user = await getCurrentUser();
  const token = user ? null : await readGuestToken();
  const where = user ? { cart: { userId: user.id } } : token ? { cart: { guestToken: token } } : null;
  if (!where) return 0;
  const agg = await db.cartItem.aggregate({ where, _sum: { quantity: true } });
  return agg._sum.quantity ?? 0;
}

/**
 * For server actions only: returns the visitor's cart, creating it (and the
 * guest cookie) if needed. When a signed-in user still has a guest cart,
 * its items are merged into the user's cart and the guest cart is removed.
 */
export async function getOrCreateCart() {
  const jar = await cookies();
  const user = await getCurrentUser();
  const guestToken = verifyCartCookie(jar.get(CART_COOKIE)?.value);

  if (user) {
    const cart = await db.cart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    if (guestToken) {
      const guest = await db.cart.findUnique({ where: { guestToken }, include: { items: true } });
      if (guest && guest.id !== cart.id) {
        await db.$transaction([
          ...guest.items.map((it) =>
            db.cartItem.upsert({
              where: { cartId_variantId: { cartId: cart.id, variantId: it.variantId } },
              update: { quantity: { increment: it.quantity } },
              create: { cartId: cart.id, variantId: it.variantId, quantity: it.quantity },
            }),
          ),
          db.cart.delete({ where: { id: guest.id } }),
        ]);
      }
      jar.delete(CART_COOKIE);
    }
    return cart;
  }

  if (guestToken) {
    const existing = await db.cart.findUnique({ where: { guestToken } });
    if (existing) return existing;
  }
  const { token, cookieValue } = createCartToken();
  const cart = await db.cart.create({
    data: { guestToken: token, expiresAt: new Date(Date.now() + cartCookieOptions.maxAge * 1000) },
  });
  jar.set(CART_COOKIE, cookieValue, cartCookieOptions);
  return cart;
}
