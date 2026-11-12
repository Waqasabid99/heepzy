"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductCard } from "./product-card";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

/**
 * "Your everyday style upgrade" — category chips filter the featured grid in place.
 * Heading, chips and cards use scroll-driven animations (Motion, see components/motion).
 */
export function ProductShowcase({ products, categories }) {
  const [active, setActive] = useState("all");
  const tabs = [{ slug: "all", name: "All" }, ...categories.filter((c) => products.some((p) => p.category === c.slug))];
  const visible = (active === "all" ? products : products.filter((p) => p.category === active)).slice(0, 6);

  return (
    <>
      <ScrollReveal
        role="group"
        aria-label="Filter by category"
        distance={40}
        scaleFrom={1}
        className="mb-9 flex flex-wrap gap-2.5"
      >
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
      </ScrollReveal>
      <p className="sr-only" role="status">
        Showing {visible.length} {visible.length === 1 ? "product" : "products"}
      </p>
      <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p, i) => (
          // Columns trail each other slightly so a row sweeps in left → right.
          <ScrollReveal key={p.id} lag={(i % 3) * 0.12} distance={96} scaleFrom={0.92} className="grid">
            <ProductCard product={p} priority={i < 3} />
          </ScrollReveal>
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
