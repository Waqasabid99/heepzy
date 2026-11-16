/** Open the cart drawer from anywhere on the page (client only). */
export const CART_OPEN_EVENT = "hz:cart-open";

export function openCartDrawer(detail = {}) {
  window.dispatchEvent(new CustomEvent(CART_OPEN_EVENT, { detail }));
}
