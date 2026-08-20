import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function time<T>(label: string, fn: () => Promise<T>) {
  const t = Date.now();
  await fn();
  console.log(`   ${label.padEnd(34)} ${Date.now() - t} ms`);
}

async function main() {
  const world = await db.world.findFirstOrThrow({ orderBy: { createdAt: "asc" } });

  console.log("=== cold: first connection + query ===");
  // (the findFirstOrThrow above already paid the connection cost)

  console.log("\n=== warm single queries ===");
  await time("wrestler.count", () => db.wrestler.count({ where: { worldId: world.id } }));
  await time("company.findMany", () => db.company.findMany({ where: { worldId: world.id } }));

  console.log("\n=== what the roster page actually does ===");
  await time("roster list + contracts", async () => {
    const ws = await db.wrestler.findMany({
      where: { worldId: world.id, status: "ACTIVE" },
      include: { contracts: { where: { endedOn: null }, include: { company: true } } },
      orderBy: { name: "asc" },
    });
    // the getRecords() pass
    await db.segment.findMany({
      where: { type: "MATCH", show: { isFinalized: true }, participants: { some: { wrestlerId: { in: ws.map((w) => w.id) } } } },
      select: { participants: { select: { wrestlerId: true, isWinner: true } } },
    });
  });

  console.log("\n=== what the dashboard does (6 queries) ===");
  await time("dashboard fan-out", async () => {
    await Promise.all([
      db.show.findMany({ where: { worldId: world.id, isFinalized: false }, take: 5, include: { companies: true, _count: { select: { segments: true } } } }),
      db.show.findMany({ where: { worldId: world.id, isFinalized: false }, take: 6, include: { companies: true, _count: { select: { segments: true } } } }),
      db.show.findMany({ where: { worldId: world.id, isFinalized: true }, take: 5, include: { companies: true } }),
      db.reign.findMany({ where: { endedOn: null }, include: { holders: true, title: { include: { company: true } } } }),
      db.contract.findMany({ where: { worldId: world.id, endedOn: null, expiresOn: { not: null, lt: new Date() } }, include: { wrestler: true, company: true } }),
      Promise.all([db.wrestler.count({ where: { worldId: world.id } }), db.company.count({ where: { worldId: world.id } }), db.show.count({ where: { worldId: world.id, isFinalized: true } })]),
    ]);
  });

  await db.$disconnect();
}
main();
