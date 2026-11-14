import "server-only";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma";
import { env, isProd } from "@/lib/env";

function wantsTls(url) {
  if (env.DATABASE_SSL) return env.DATABASE_SSL === "true";
  return url.searchParams.get("ssl") === "true" || Boolean(url.searchParams.get("sslaccept"));
}

function createClient() {
  const url = new URL(env.DATABASE_URL);
  const adapter = new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    connectionLimit: env.DATABASE_POOL_SIZE,
    allowPublicKeyRetrieval: url.searchParams.get("allowPublicKeyRetrieval") === "true",
    // Hosted databases (TiDB Cloud, PlanetScale…) require TLS; local Docker doesn't.
    ...(wantsTls(url) ? { ssl: { rejectUnauthorized: true } } : {}),
    timezone: "Z",
  });

  return new PrismaClient({
    adapter,
    log: isProd ? ["error"] : ["error", "warn"],
  });
}

// Reuse one client across hot reloads in dev so we don't exhaust connections.
const globalForPrisma = globalThis;

export const db = globalForPrisma.__heepzyPrisma ?? createClient();

if (!isProd) globalForPrisma.__heepzyPrisma = db;
