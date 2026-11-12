"use client";

import { useState } from "react";
import Link from "next/link";
import { ProductCard } from "./product-card";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { ArrowRight } from "@/components/ui/icons";

const TABS = [
  { key: "women", label: "Women", genders: ["WOMEN", "UNISEX"], href: "/products?gender=women" },
  { key: "men", label: "Men", genders: ["MEN", "UNISEX"], href: "/products?gender=men" },
  { key: "all", label: "All", genders: null, href: "/products" },
];

/** Featured products with Women / Men / All tabs. Cards rise in on scroll (Motion). */
export function HomeProducts({ products, limit = 10 }) {
  const [active, setActive] = useState("women");
  const tab = TABS.find((t) => t.key === active);
  const visible = (tab.genders ? products.filter((p) => tab.genders.includes(p.gender)) : products).slice(0, limit);

  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <ScrollReveal
          as="h2"
          id="exclusives-title"
          distance={40}
          scaleFrom={1}
          className="display text-[clamp(34px,4vw,52px)]"
        >
          Trending now
        </ScrollReveal>
        <div role="group" aria-label="Show products for" className="flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={active === t.key}
              onClick={() => setActive(t.key)}
              className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-[13px] font-extrabold tracking-[0.06em] uppercase transition-colors hover:border-fg aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-bg"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <p className="sr-only" role="status">
        Showing {visible.length} {tab.label === "All" ? "" : `${tab.label.toLowerCase()}'s `}products
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-4 md:grid-cols-3 xl:grid-cols-5">
        {visible.map((p, i) => (
          <ScrollReveal key={p.id} lag={(i % 5) * 0.06} distance={72} scaleFrom={0.94} className="grid">
            <ProductCard product={p} priority={i < 2} sizes="(min-width: 1280px) 19vw, (min-width: 768px) 30vw, 46vw" />
          </ScrollReveal>
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <Link href={tab.href} className="btn-outline">
          View all {tab.key === "all" ? "shoes" : `${tab.label.toLowerCase()}'s shoes`}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </>
  );
}
