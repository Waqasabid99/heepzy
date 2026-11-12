"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductCard } from "./product-card";

/** "Your everyday style upgrade" — category chips filter the featured grid in place. */
export function ProductShowcase({ products, categories }) {
  const [active, setActive] = useState("all");
  const tabs = [{ slug: "all", name: "All" }, ...categories.filter((c) => products.some((p) => p.category === c.slug))];
  const visible = (active === "all" ? products : products.filter((p) => p.category === active)).slice(0, 6);

  return (
    <>
      <div role="group" aria-label="Filter by category" className="mb-9 flex flex-wrap gap-2.5">
        {tabs.map((t) => (
          <button
            key={t.slug}
            type="button"
            className="chip"
            aria-pressed={active === t.slug}
            onClick={() => setActive(t.slug)}
          >
            {t.name}
          </button>
        ))}
      </div>
      <p className="sr-only" role="status">
        Showing {visible.length} {visible.length === 1 ? "product" : "products"}
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 3} />
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <Link href={active === "all" ? "/products" : `/products?category=${active}`} className="btn-outline">
          View all {active === "all" ? "shoes" : tabs.find((t) => t.slug === active)?.name.toLowerCase()}
        </Link>
      </div>
    </>
  );
}
