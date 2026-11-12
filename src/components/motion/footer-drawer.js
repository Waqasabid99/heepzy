"use client";

import { createContext, use, useRef } from "react";
import { LazyMotion, domAnimation, m, useScroll, useTransform } from "motion/react";
import { useMotionReady } from "./use-motion-ready";

const DrawerContext = createContext(null);

/**
 * Footer "drawer": as the footer scrolls into view the dark panel slides up
 * from below and opens out to full width (rounded top corners flatten);
 * its columns follow a beat behind. Fully scroll-linked (reverses on scroll up).
 */
export function FooterDrawer({ children, className }) {
  const ref = useRef(null);
  const ready = useMotionReady();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const y = useTransform(scrollYProgress, [0, 0.85], ["14%", "0%"]);
  const scale = useTransform(scrollYProgress, [0, 0.85], [0.94, 1]);
  const radius = useTransform(scrollYProgress, [0, 0.85], [48, 0]);

  return (
    <LazyMotion features={domAnimation} strict>
      <DrawerContext value={ready ? scrollYProgress : null}>
        <m.div
          ref={ref}
          className={className}
          style={
            ready
              ? { y, scale, borderTopLeftRadius: radius, borderTopRightRadius: radius, transformOrigin: "50% 100%" }
              : undefined
          }
        >
          {children}
        </m.div>
      </DrawerContext>
    </LazyMotion>
  );
}

/** A child of <FooterDrawer> that rises in over part of the drawer's progress. */
export function DrawerItem({ children, className, from = 0.1, to = 0.9, distance = 120, as = "div", ...props }) {
  const progress = use(DrawerContext);
  const fallback = useScrollFallback();
  const p = progress ?? fallback;
  const y = useTransform(p, [from, to], [distance, 0]);
  const opacity = useTransform(p, [from, to], [0, 1]);
  const Tag = m[as];
  return (
    <Tag className={className} style={progress ? { y, opacity } : undefined} {...props}>
      {children}
    </Tag>
  );
}

// Hooks can't be conditional; give useTransform a static source when the drawer is inactive.
function useScrollFallback() {
  return useScroll().scrollYProgress;
}
