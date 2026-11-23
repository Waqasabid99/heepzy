import "server-only";
import { formatPKR } from "@/lib/money";
import { PROVINCES } from "@/lib/checkout";
import { orderUrl } from "@/lib/order-link";
import { waLink } from "@/lib/whatsapp";

/**
 * The message a customer sends to the store to place a WhatsApp order:
 * everything the owner needs to confirm it without opening the admin.
 */
export function ownerOrderMessage(order, storeName) {
  const n = (v) => Number(v ?? 0);
  const lines = [
    `Assalam o Alaikum ${storeName}! I'd like to place this order:`,
    "",
    `*Order ${order.orderNumber}*`,
    ...order.items.map(
      (i) => `• ${i.productName}, ${i.color}, size ${i.size} × ${i.quantity}: ${formatPKR(i.lineTotal)}`,
    ),
    "",
    `Subtotal: ${formatPKR(order.subtotal)}`,
    n(order.discountTotal)
      ? `Discount${order.couponCode ? ` (${order.couponCode})` : ""}: −${formatPKR(order.discountTotal)}`
      : null,
    `Delivery: ${n(order.shippingTotal) ? formatPKR(order.shippingTotal) : "Free"}${order.deliveryRateName ? ` · ${order.deliveryRateName}` : ""}`,
    `*Total: ${formatPKR(order.grandTotal)}*`,
    "",
    "*Deliver to*",
    order.shipFullName,
    order.shipLine1,
    order.shipLine2 || null,
    `${order.shipCity}, ${PROVINCES[order.shipProvince] ?? order.shipProvince}${order.shipPostalCode ? ` ${order.shipPostalCode}` : ""}`,
    `Phone: ${order.shipPhone}`,
    order.customerNote ? `\nNote: ${order.customerNote}` : null,
    "",
    "Please confirm my order and let me know how to pay.",
    `Order details: ${orderUrl(order.orderNumber)}`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

/** wa.me link to the store's number with the order typed in, or null if the number isn't set. */
export function ownerOrderLink(order, settings) {
  return waLink(settings.whatsappNumber, ownerOrderMessage(order, settings.storeName));
}
