<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Heepzy project conventions

- JavaScript only (no TypeScript). Next.js 16 with `cacheComponents` + `partialPrefetching`: anything reading cookies/headers/session or uncached DB data must render inside `<Suspense>`; cache shared data with `"use cache"` + `cacheTag`.
- Database access only through `@/lib/db` (server-only). Convert Prisma results with `toPlain()` before passing to client components or returning from `"use cache"` functions.
- AuthZ lives in `@/lib/session`. Every admin page must be wrapped in `withAdmin()`; every admin server action / data function must call `requireAdmin()` first (layout-only checks leak page content). Log admin mutations with `audit()`.
- Validate all inputs with zod; apply `rateLimit(name, LIMITS.x)` to public mutations (checkout, coupon, review, returns, lookups).
- Styling: use semantic tokens/utilities from `src/app/globals.css` only (no raw colours). Both light and dark themes must work. Brand is crimson (`bg-accent`/`text-accent-fg` fills, `text-brand` for red text); saffron/emerald are campaign fills. No emoji anywhere in the UI: use the SVG icons in `src/components/ui/icons.js`. Keep WCAG 2.2 AA: labels, focus-visible, 44px targets, alt text.
- Money is DECIMAL(12,2) PKR; format with `formatPKR()`. Orders snapshot prices and addresses.
- Schema changes: edit `prisma/schema.prisma`, then `npm run db:migrate -- --name <change>`; commit the migration.
- Storefront routes live in `src/app/(store)/(home)` and `src/app/(store)/(shop)`; both use the flat sticky `SiteHeader`. Never read `usePathname`/`useSearchParams` in shared chrome outside `<Suspense>` — it blocks prerendering on dynamic routes.
- Catalogue reads go through `src/lib/catalog.js` (`"use cache"` + `CATALOG_TAG`); cart state through `src/lib/cart.js` and the actions in `src/actions/cart.js`.
