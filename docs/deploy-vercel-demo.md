# Demo on Vercel (free): Vercel + TiDB Cloud + Vercel Blob

Everything here is optional. Without these settings the app runs as before:
MySQL from `DATABASE_URL` and uploads on local disk (`UPLOAD_DIR`).

## 1. Database: TiDB Cloud Starter (free)
1. Sign up at tidbcloud.com, create a **Starter** cluster. Pick the region closest to your viewers
   (Singapore, `ap-southeast-1`, matches `"regions": ["sin1"]` in `vercel.json`).
2. Create a database named `heepzy` (SQL editor: `CREATE DATABASE heepzy;`).
3. Click **Connect** -> connect with **Prisma**/general, copy host, port (4000), user and password.
4. Your `DATABASE_URL`:
   `mysql://<user>:<password>@<host>:4000/heepzy?sslaccept=strict`
   (URL-encode special characters in the password.)

## 2. Vercel project
1. Import `Waqasabid99/heepzy`. Framework: Next.js (settings come from `vercel.json`).
2. Storage tab -> **Create** -> **Blob** -> public store, connect it to the project. This adds
   `BLOB_READ_WRITE_TOKEN`; uploads then go to Blob automatically.
3. Environment variables (Production):
   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | the TiDB URL above |
   | `DATABASE_POOL_SIZE` | `3` |
   | `NEXT_PUBLIC_APP_URL` | `https://heepzy.waser.cloud` |
   | `BETTER_AUTH_URL` | `https://heepzy.waser.cloud` |
   | `BETTER_AUTH_SECRET` | `openssl rand -base64 48` |
   | `CART_COOKIE_SECRET` | `openssl rand -base64 32` |
   | `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | `openssl rand -base64 32` |
4. Settings -> Domains -> add `heepzy.waser.cloud` (DNS is automatic when the domain is on the same Vercel account).
5. Deploy. The build runs `prisma migrate deploy` first, so the tables are created.

## 3. Demo data (run once from your computer)
```bash
DATABASE_URL='<the TiDB URL>' \
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='<12+ chars>' \
npm run db:seed
```

## Limits on Vercel
- Image uploads are capped at 4 MB (Vercel request-body limit).
- Return requests accept photos only (no video) while on Blob.
- Hobby plan is for non-commercial use: fine for a demo, move to Pro (or Hostinger) for real sales.
