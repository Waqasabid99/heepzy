"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Marks itself aria-current when its path matches. Render inside <Suspense> with a plain <Link> fallback. */
export function NavLink({ href, match, className, children }) {
  const pathname = usePathname();
  const active = match === "/" ? pathname === "/" : match ? pathname.startsWith(match) : false;
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
      {children}
    </Link>
  );
}
