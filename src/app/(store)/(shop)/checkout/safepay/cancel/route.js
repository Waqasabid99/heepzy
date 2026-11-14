import { NextResponse } from "next/server";

/** Shopper left Safepay's page without paying: back to the order with a retry option. */
export async function GET(request) {
  const url = new URL(request.url);
  const orderNumber = url.searchParams.get("order") ?? "";
  if (!/^HZ-[0-9A-Z-]{4,16}$/.test(orderNumber)) return NextResponse.redirect(new URL("/cart", url), 303);
  const dest = new URL(`/checkout/complete/${orderNumber}`, url);
  dest.searchParams.set("t", url.searchParams.get("t") ?? "");
  dest.searchParams.set("payment", "cancelled");
  return NextResponse.redirect(dest, 303);
}
