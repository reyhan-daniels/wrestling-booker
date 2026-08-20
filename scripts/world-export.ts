/**
 * Export or restore an entire world as JSON.
 *
 *   npm run world:export                    # first world -> backups/world-<name>-<stamp>.json
 *   npm run world:export -- <worldId>
 *   npm run world:import -- <file.json>     # recreate that world
 *
 * This exists because pg_dump refuses to run against a server newer than
 * itself, and managed Postgres is usually several major versions ahead of
 * whatever the local machine has. Going through Prisma sidesteps the version
 * problem entirely, and the result restores anywhere the schema exists.
 *
 * Ids are preserved, so a restore rebuilds the world exactly — including
 * title lineages, which point at the shows and segments that created them.
 */
import "dotenv/config";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function exportWorld(worldId?: string) {
  const world = worldId
    ? await db.world.findUniqueOrThrow({ where: { id: worldId } })
    : await db.world.findFirstOrThrow({ orderBy: { createdAt: "asc" } });

  const [companies, wrestlers, photos, contracts, titles, series, shows, segments, participants, reigns] =
    await Promise.all([
      db.company.findMany({ where: { worldId: world.id } }),
      db.wrestler.findMany({ where: { worldId: world.id } }),
      db.wrestlerPhoto.findMany({ where: { wrestler: { worldId: world.id } } }),
      db.contract.findMany({ where: { worldId: world.id } }),
      db.title.findMany({ where: { company: { worldId: world.id } } }),
      db.weeklySeries.findMany({ where: { company: { worldId: world.id } } }),
      db.show.findMany({ where: { worldId: world.id }, include: { companies: { select: { id: true } } } }),
      db.segment.findMany({ where: { show: { worldId: world.id } } }),
      db.segmentParticipant.findMany({ where: { segment: { show: { worldId: world.id } } } }),
      db.reign.findMany({
        where: { title: { company: { worldId: world.id } } },
        include: { holders: { select: { id: true } } },
      }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    world,
    companies,
    wrestlers,
    // Bytes do not survive JSON, so portraits travel as base64.
    photos: photos.map((p) => ({ ...p, bytes: Buffer.from(p.bytes).toString("base64") })),
    contracts,
    titles,
    series,
    shows,
    segments,
    participants,
    reigns,
  };
}

type Dump = Awaited<ReturnType<typeof exportWorld>>;

async function importWorld(dump: Dump) {
  const existing = await db.world.findUnique({ where: { id: dump.world.id } });
  if (existing) throw new Error(`World ${dump.world.id} already exists. Delete it first, or import into a clean database.`);

  await db.$transaction(async (tx) => {
    await tx.world.create({ data: { id: dump.world.id, name: dump.world.name, createdAt: dump.world.createdAt } });
    for (const row of dump.companies) await tx.company.create({ data: row });
    for (const row of dump.wrestlers) await tx.wrestler.create({ data: row });
    for (const row of dump.photos) {
      await tx.wrestlerPhoto.create({
        data: { wrestlerId: row.wrestlerId, mimeType: row.mimeType, bytes: new Uint8Array(Buffer.from(row.bytes, "base64")) },
      });
    }
    for (const row of dump.contracts) await tx.contract.create({ data: row });
    for (const row of dump.titles) await tx.title.create({ data: row });
    for (const row of dump.series) await tx.weeklySeries.create({ data: row });
    for (const { companies, ...row } of dump.shows) {
      await tx.show.create({ data: { ...row, companies: { connect: companies.map((c) => ({ id: c.id })) } } });
    }
    for (const row of dump.segments) await tx.segment.create({ data: row });
    for (const row of dump.participants) await tx.segmentParticipant.create({ data: row });
    for (const { holders, ...row } of dump.reigns) {
      await tx.reign.create({ data: { ...row, holders: { connect: holders.map((h) => ({ id: h.id })) } } });
    }
  }, { timeout: 120_000 });
}

async function main() {
  const mode = process.argv[2];
  const arg = process.argv[3];

  if (mode === "import") {
    if (!arg) throw new Error("Pass the path to an exported .json file.");
    const dump = JSON.parse(readFileSync(arg, "utf8"), (key, value) =>
      /At$|On$/.test(key) && typeof value === "string" ? new Date(value) : value,
    ) as Dump;
    await importWorld(dump);
    console.log(`Restored "${dump.world.name}" — ${dump.wrestlers.length} wrestlers, ${dump.shows.length} shows.`);
  } else {
    const dump = await exportWorld(arg);
    mkdirSync("backups", { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
    const file = `backups/world-${dump.world.name.replace(/\W+/g, "-").toLowerCase()}-${stamp}.json`;
    writeFileSync(file, JSON.stringify(dump, null, 2));
    console.log(`Exported "${dump.world.name}" to ${file}`);
    console.log(
      `  ${dump.wrestlers.length} wrestlers, ${dump.companies.length} companies, ${dump.titles.length} titles, ` +
        `${dump.shows.length} shows, ${dump.segments.length} segments, ${dump.reigns.length} reigns, ${dump.photos.length} photos`,
    );
  }
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
