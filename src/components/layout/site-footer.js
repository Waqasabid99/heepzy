import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-surface-muted">
      <div className="container-page grid gap-8 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold">Heepzy</p>
          <p className="mt-2 text-fg-muted">Shoes delivered across Pakistan. Cash on delivery available.</p>
        </div>
        <nav aria-label="Help">
          <p className="font-semibold">Help</p>
          <ul className="mt-2 grid gap-1.5 text-fg-muted">
            <li>
              <Link href="/size-guide" className="hover:text-fg">
                Size guide
              </Link>
            </li>
            <li>
              <Link href="/account/orders" className="hover:text-fg">
                Track your order
              </Link>
            </li>
            <li>
              <Link href="/account/returns" className="hover:text-fg">
                Returns &amp; refunds
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Shop">
          <p className="font-semibold">Shop</p>
          <ul className="mt-2 grid gap-1.5 text-fg-muted">
            <li>
              <Link href="/products" className="hover:text-fg">
                All shoes
              </Link>
            </li>
            <li>
              <Link href="/offers" className="hover:text-fg">
                Offers
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <p className="container-page border-t border-border py-4 text-xs text-fg-subtle">© Heepzy. All prices in PKR.</p>
    </footer>
  );
}
