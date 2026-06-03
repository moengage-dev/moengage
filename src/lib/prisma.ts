// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const poolMax = Number.parseInt(
  process.env.PG_POOL_MAX ?? (process.env.VERCEL ? "1" : "5"),
  10,
);

const ssl =
  process.env.PG_SSL_REJECT_UNAUTHORIZED === "true"
    ? { rejectUnauthorized: true }
    : { rejectUnauthorized: false };

if (!globalForPrisma.pool) {
  globalForPrisma.pool = new Pool({
    connectionString: databaseUrl,
    max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 1,
    ssl,
  });
}

if (!globalForPrisma.prisma) {
  const adapter = new PrismaPg(globalForPrisma.pool);

  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const prisma = globalForPrisma.prisma;

export default prisma;
