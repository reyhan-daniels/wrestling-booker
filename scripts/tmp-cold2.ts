import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function probe(label: string) {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const t = Date.now();
  await db.world.count();
  const ms = Date.now() - t;
  await db.$disconnect();
  console.log(`${label}: ${ms} ms`);
  return ms;
}

async function main() {
  await probe("baseline (warm)");
  console.log("idling 8 minutes with zero open connections...");
  await new Promise((r) => setTimeout(r, 8 * 60 * 1000));
  await probe("first query after 8 min idle");
  await probe("second query (warm)");
  await probe("third query (warm)");
}
main();
