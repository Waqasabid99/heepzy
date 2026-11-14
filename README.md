# Heepzy — Online shoe store (Pakistan)

Full-stack e-commerce app built with **Next.js 16 (App Router, JavaScript)**, **MySQL** via **Prisma 7**, **Better Auth**, and **Tailwind CSS v4**. Deployed on **Hostinger** (Node.js app from GitHub, Hostinger MySQL).

## Stack

| Concern    | Choice                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------ |
| Framework  | Next.js 16 — Cache Components, Partial Prefetching, React Compiler, `src/proxy.js`               |
| Database   | MySQL 8 / MariaDB, Prisma 7 with the `@prisma/adapter-mariadb` driver adapter (no binary engine) |
| Auth       | Better Auth (email + password, DB sessions, admin plugin, DB-backed rate limiting)               |
| Validation | Zod 4                                                                                            |
| Styling    | Tailwind CSS v4 with semantic design tokens (`src/app/globals.css`), light (default) + dark      |
| Payments   | Cash on delivery + Safepay hosted checkout (cards / digital wallets)                             |

## Local development

Requirements: Node 22 (`.nvmrc`), Docker.

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in the secrets (see comments in the file)
npm run db:up               # MySQL 8.4 on 127.0.0.1:3308 (docker-compose.yml)
npm run db:migrate          # apply migrations
npm run db:seed             # admin user, settings, GST, delivery zones, sample product
npm run dev                 # http://localhost:3000
```

- Storefront: `http://localhost:3000`
- Admin: `http://localhost:3000/admin` (sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)
- DB browser: `npm run db:studio`

Generate secrets with `openssl rand -base64 48`.

### Scripts

| Script                    | Purpose                                         |
| ------------------------- | ----------------------------------------------- |
| `dev` / `build` / `start` | Next.js (build runs `prisma generate` first)    |
| `lint`, `format`          | ESLint, Prettier (+ Tailwind class sorting)     |
| `db:up` / `db:down`       | Start/stop the local MySQL container            |
| `db:migrate`              | Create + apply a migration in development       |
| `db:deploy`               | Apply pending migrations (production)           |
| `db:seed`                 | Idempotent seed                                 |
| `db:reset`                | Drop, re-migrate and re-seed the local database |

## Project structure

```
prisma/
  schema.prisma          # full domain model (catalogue, carts, orders, payments, returns, promos…)
  migrations/            # committed SQL migrations
  seed.mjs
src/
  proxy.js               # per-IP rate limit + optimistic auth redirects
  app/
    (store)/             # storefront: /, /products, /products/[slug], /offers, /size-guide,
                         #   /cart, /checkout, /login, /register, /account/*
    admin/(auth)/login   # admin sign-in (no admin chrome)
    admin/(panel)/       # admin panel: orders, products, inventory, customers, returns,
                         #   reviews, promotions, coupons, content, settings/*, audit-log
    api/auth/[...all]    # Better Auth handler
    api/health           # uptime / DB check
    api/webhooks/safepay # signed webhook receiver
  components/            # ui/, layout/, theme/, auth/, admin/
  lib/
    env.js               # zod-validated env (fails fast on boot)
    db.js                # Prisma client singleton (mariadb adapter, small pool)
    auth.js / auth-client.js
    session.js           # Data Access Layer: getCurrentUser, requireUser, requireAdmin
    rate-limit.js        # MySQL-backed fixed-window limiter + presets
    cart-token.js        # HMAC-signed guest cart cookie
    settings.js          # cached store settings (cacheTag "store-settings")
    payments/safepay.js  # Safepay client: checkout session, status check, webhook signature
    audit.js, money.js, serialize.js, request.js, safe-redirect.js
  generated/prisma/      # generated client (git-ignored)
```

## Domain overview

- **Catalogue**: `Product` → `ProductVariant` (one SKU per colour × size, holds stock and optional price override), `ProductImage` (alt text required), `Brand`, `Category` (tree), `SizeChart` + `SizeChartEntry` (EU/UK/US/cm).
- **Inventory**: every stock change is recorded in `InventoryMovement` (sale, restock, return, adjustment…).
- **Cart**: one `Cart` per user, or per guest (`guestToken` in a signed httpOnly cookie). Merge the guest cart into the user's cart on login.
- **Pricing**: `TaxRate` (GST, optional per province, inclusive/exclusive via settings), `DeliveryZone` (cities/provinces) + `DeliveryRate` (price, COD fee, free-above), global free delivery threshold, `Promotion` (automatic offers), `Coupon` (voucher codes with limits) + `CouponRedemption`.
- **Orders**: `Order` keeps an address and price **snapshot**; `OrderItem` snapshots name, SKU, size and price. `OrderStatusHistory` is the timeline, and `Payment` records COD or Safepay attempts keyed by a unique `merchantRef` (idempotency). `WebhookEvent` deduplicates provider callbacks.
- **Returns & refunds**: `ReturnRequest` (RMA) → `ReturnItem` → `Refund`. They can be switched on or off with `StoreSettings.returnsEnabled` / `refundsEnabled`.
- **Admin**: `role = "admin"` on `User` (Better Auth admin plugin: ban, impersonate, sessions). `AuditLog` records every admin mutation.

## Security model

- **AuthN**: Better Auth with DB sessions in httpOnly, `SameSite=Lax`, `Secure` (prod) cookies prefixed `hz`. Passwords are hashed with scrypt, sessions last 14 days, and sessions are revoked on password reset.
- **AuthZ**: always enforced server-side in `src/lib/session.js`. `src/proxy.js` only does optimistic redirects.
  - **Wrap every admin page in `withAdmin()`** (`src/components/admin/with-admin.js`). Next renders layouts and pages separately, so a layout-only check would still send the page's content to non-admins. This has been verified.
  - **Call `requireAdmin()` at the top of every admin server action and data function.** Server actions can be called directly, without loading the page.
  - Session-dependent UI must render inside `<Suspense>` (Cache Components).
- **Rate limiting**, in three layers:
  1. `proxy.js`: in-memory, per IP, 300 reads and 60 writes per minute.
  2. Better Auth: DB-backed. Sign-in allows 5/min, sign-up 5 per 10 min, password reset 3 per 10 min.
  3. `rateLimit()` in `src/lib/rate-limit.js`: DB-backed presets for checkout, coupon, review, return, and guest order lookup.
- **Input**: validate every server action and route handler with Zod. Use Prisma for parameterised queries, and only tagged-template `$queryRaw` for raw SQL.
- **CSRF**: Server Actions check the Origin header, Better Auth checks `trustedOrigins`, and cookies are `SameSite=Lax`.
- **Headers** (`next.config.mjs`): CSP, HSTS, `X-Frame-Options: DENY`, nosniff, Referrer-Policy, and Permissions-Policy. Admin, account, cart and checkout pages also send `Cache-Control: private, no-store`. The CSP is static (no nonce), which keeps static rendering and prefetching.
- **Payments**: card data never touches the server: shoppers pay on Safepay's hosted page (PCI scope SAQ-A). An order is only marked paid after our server asks Safepay's API for the tracker's state and checks the amount and order number. Webhooks are HMAC-SHA512 verified with a constant-time compare and deduplicated by event ID.
- **Open redirects**: the `?next=` parameter goes through `safeRedirectPath()`.
- **Secrets**: kept in env only and validated at boot (`src/lib/env.js`). `.env*` is git-ignored except `.env.example`.
- **Behind a proxy/CDN**: set `TRUSTED_PROXIES` (comma-separated IPs) so client IPs resolve correctly for rate limiting.

## Accessibility

The project targets WCAG 2.2 AA:

- Skip link, landmarks (`header`, `nav` with labels, `main#main`, `footer`), and `lang="en-PK"`
- Global `:focus-visible` ring, minimum 44px touch targets (`min-h-11`), and `prefers-reduced-motion` support
- Form fields have labels, errors are announced via `role="alert"`, and product images require alt text (enforced in the schema)
- The mobile menu uses native `<details>`, so it works without JavaScript
- Light and dark colour tokens are chosen for AA contrast; re-check them when the final palette lands

## Design

The approved look ("Reimagined Comfort") is on the Heepzy Design canvas. It uses Oswald for display text and prices, Manrope for UI and body text, a near-black ink on off-white, a lemon accent used only as a fill, pill controls and rounded image tiles. The header has two variants:

- `(home)`: the header sits over the dark hero.
- `(shop)`: a floating pill bar on every other page.

The route groups under `src/app/(store)/` choose the variant.

Photography is from Unsplash, used under the Unsplash License as placeholders. See `public/images/CREDITS.md`, and replace the photos with your own before launch.

## Theming / design tokens

All colours, radii, shadows, fonts and motion values are **semantic tokens** in `src/app/globals.css`:

- Raw variables (`--hz-*`) are defined on `:root` (light) and `[data-theme="dark"]`.
- `@theme inline` exposes them as Tailwind utilities: `bg-surface`, `text-fg-muted`, `border-border`, `bg-primary`, `text-accent`, `rounded-card`, `shadow-raised`, `font-display`, `max-w-content`…
- Reusable utilities: `container-page`, `btn-primary`, `btn-accent`, `btn-outline`, `btn-ghost`, `input`, `label`, `card`, `skip-link`.
- The theme is stored in `localStorage` (`hz-theme`) and applied before paint by `ThemeScript`. Light is the default. Toggle it with `<ThemeToggle />`.

To re-skin from design references, change the token values. Components shouldn't use raw colours.

## Deploying to Hostinger

1. **Database**: in hPanel → Databases → MySQL Databases, create a database and user. Note the host, which is usually `localhost` for apps on the same server.
2. **App**: in hPanel → Websites → Add website → **Node.js app** → _Import Git repository_, connect GitHub and pick `Waqasabid99/heepzy`, branch `main`.
   - Node version: **22.x**
   - Build command: `npm run db:deploy && npm run build`. This applies migrations, then builds.
   - Start command: `npm start`
3. **Environment variables**: in the app's settings, add every variable from `.env.example` with production values:
   - `NODE_ENV=production`
   - `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` set to `https://your-domain`
   - The Hostinger `DATABASE_URL`, without `allowPublicKeyRetrieval`
   - `DATABASE_POOL_SIZE=5`
   - New random values for `BETTER_AUTH_SECRET`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` and `CART_COOKIE_SECRET`
   - The Safepay keys (`SAFEPAY_ENVIRONMENT=production` and live keys)
4. **First deploy only**: seed the admin. Run `npm run db:seed` with `SEED_ADMIN_*` set, either over SSH or locally pointed at the production `DATABASE_URL`. Then remove `SEED_ADMIN_PASSWORD` from the environment.
5. **Domain and SSL**: enable SSL in hPanel. HSTS and `upgrade-insecure-requests` are already sent in production.
6. Each push to `main` redeploys. Keep `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` the same across deploys.

> Shared hosting has low MySQL connection limits. Keep `DATABASE_POOL_SIZE` small (3–5).

## Payments: Safepay

Flow (`src/actions/checkout.js`, `src/lib/payments/safepay.js`, `src/lib/orders.js`):

1. **Place order** re-prices the bag from the database, reserves stock atomically and creates the order.
2. For card payments it creates a Safepay session (tracker) and redirects to Safepay's hosted checkout.
3. Safepay redirects back to `/checkout/safepay/return` and sends a webhook to `/api/webhooks/safepay`.
   Both call `settleSafepayPayment`, which asks Safepay's reporter API for the real state, checks the amount
   and order number, then marks the order paid (idempotent; whichever arrives first wins).
4. Cancelled payments land on the order page with a "Pay now" retry.

Setup:

- `.env`: `SAFEPAY_ENVIRONMENT` (`sandbox`/`production`), `NEXT_PUBLIC_SAFEPAY_PUBLIC_KEY`, `SAFEPAY_SECRET_KEY`,
  `SAFEPAY_WEBHOOK_SHARED_SECRET_KEY`.
- Safepay dashboard → Developers → Endpoints: add `https://your-domain/api/webhooks/safepay`
  (`/api/v1/webhooks/inspect` is an alias used during testing).
- Store settings: `cardPaymentsEnabled` must be on. Sandbox test card: Safepay's "Dummy card information" page.
- Refunds are issued from the Safepay dashboard for now; cancelling a paid order reminds the admin to do so.

## Status

This commit is the **project foundation**. It includes the schema, auth, security, theming, route skeletons, the payment client and the seed. Feature UIs (catalogue, cart, checkout, admin CRUD) will be built next, using the design references.
