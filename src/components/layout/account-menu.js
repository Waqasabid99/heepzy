"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from "@headlessui/react";
import { authClient } from "@/lib/auth-client";
import { Exchange, Grid, Receipt, User } from "@/components/ui/icons";

const item =
  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold data-focus:bg-muted data-disabled:opacity-50";

/** Signed-in header control: initial in a circle, opens a menu with account links. */
export function AccountMenu({ name, staff, roleLabel }) {
  const [pending, start] = useTransition();
  const first = (name || "").trim().split(/\s+/)[0] || "Account";
  const initial = first[0]?.toUpperCase() ?? "?";

  return (
    <Menu as="div" className="relative">
      <MenuButton
        aria-label={`Account menu for ${first}`}
        className="flex min-h-11 items-center gap-2 rounded-full p-1 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring xl:pr-3"
      >
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-full bg-accent text-sm font-extrabold text-accent-fg"
        >
          {initial}
        </span>
        <span aria-hidden="true" className="hidden max-w-28 truncate text-sm font-bold xl:inline">
          {first}
        </span>
      </MenuButton>
      {/* modal={false}: don't lock page scrolling (it hid the scrollbar and shifted the page). */}
      <MenuItems
        modal={false}
        anchor={{ to: "bottom end", gap: 8 }}
        className="z-50 w-60 rounded-2xl border border-line bg-surface p-1.5 shadow-xl focus:outline-none"
      >
        <div className="px-3 pt-2 pb-2.5">
          <p className="text-xs text-fg-muted">Signed in as</p>
          <p className="truncate text-sm font-bold">{name || first}</p>
          {roleLabel ? <p className="text-xs text-fg-muted">{roleLabel}</p> : null}
        </div>
        <MenuSeparator className="my-1 h-px bg-line" />
        {staff ? (
          <MenuItem>
            <Link href="/admin" className={item}>
              <Grid className="size-4" /> Admin dashboard
            </Link>
          </MenuItem>
        ) : null}
        <MenuItem>
          <Link href="/account" className={item}>
            <User className="size-4" /> My account
          </Link>
        </MenuItem>
        <MenuItem>
          <Link href="/account/orders" className={item}>
            <Receipt className="size-4" /> My orders
          </Link>
        </MenuItem>
        <MenuItem>
          <Link href="/account/returns" className={item}>
            <Exchange className="size-4" /> Returns & exchanges
          </Link>
        </MenuItem>
        <MenuSeparator className="my-1 h-px bg-line" />
        <MenuItem disabled={pending}>
          <button
            type="button"
            className={`${item} text-sale`}
            onClick={() =>
              start(async () => {
                await authClient.signOut();
                // Full load on purpose: the whole page must re-render signed out.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.assign("/");
              })
            }
          >
            {pending ? "Signing out…" : "Sign out"}
          </button>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
