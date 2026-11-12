"use client";

import { useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";

const subscribe = () => () => {};

/**
 * True only on the client, after hydration, when the user hasn't asked for
 * reduced motion. Server HTML (and no-JS visitors) always get the plain,
 * fully visible layout; scroll effects attach after hydration.
 */
export function useMotionReady() {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const reduce = useReducedMotion();
  return isClient && !reduce;
}
