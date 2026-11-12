"use client";

import { useRef } from "react";
import { LazyMotion, domAnimation, m, useScroll, useTransform } from "motion/react";
import { useMotionReady } from "./use-motion-ready";

/**
 * Scroll-linked reveal: as the element travels from the bottom of the viewport
 * to ~60% up, it rises, fades and scales in — progress follows the scrollbar
 * (scrubbing back reverses it). `lag` (0–0.5) starts later, so items in the
 * same row sweep in one after another.
 */
export function ScrollReveal({ children, className, lag = 0, distance = 72, scaleFrom = 0.94, as = "div" }) {
  const ref = useRef(null);
  const ready = useMotionReady();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.6"] });
  const range = [lag, Math.min(1, lag + 0.75)];
  const y = useTransform(scrollYProgress, range, [distance, 0]);
  const opacity = useTransform(scrollYProgress, range, [0, 1]);
  const scale = useTransform(scrollYProgress, range, [scaleFrom, 1]);

  const Tag = m[as];
  return (
    <LazyMotion features={domAnimation} strict>
      <Tag ref={ref} className={className} style={ready ? { y, opacity, scale } : undefined}>
        {children}
      </Tag>
    </LazyMotion>
  );
}
