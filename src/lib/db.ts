import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// The connection string points at a local user-owned Postgres in development
// and at managed Postgres in production. Same adapter either way.
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

// Next's dev server re-evaluates modules on every edit; without this the
// connection pool would grow on each hot reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
