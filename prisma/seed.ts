/**
 * Optional demo data: `npm run seed`.
 *
 * Creates a separate world called "Demo Universe" so it never touches a world
 * you are actually booking. Switch to it from Settings; delete it there when
 * you are done looking around.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { SegmentType } from "../src/generated/prisma/enums";
import { applyTitleChanges } from "../src/lib/titles";
import { parseISODate } from "../src/lib/dates";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const ROSTER = [
  { name: "Damien Cross", nickname: "The Iron Saint", align: "HEEL" },
  { name: "Rico Vega", nickname: "El Relámpago", align: "FACE" },
  { name: "Buddy Kane", nickname: "Big Buddy", align: "FACE" },
  { name: "Marcus Steele", nickname: "The Blueprint", align: "HEEL" },
  { name: "Jonah Vance", nickname: null, align: "TWEENER" },
  { name: "Kip Sullivan", nickname: "The Ace of Spades", align: "HEEL" },
  { name: "Nate Ruiz", nickname: null, align: "FACE" },
  { name: "Vic Malone", nickname: "The Enforcer", align: "HEEL" },
  { name: "Andre Sol", nickname: "Sunfall", align: "FACE" },
  { name: "Teddy Marsh", nickname: null, align: "TWEENER" },
  { name: "Gio Fontaine", nickname: "Champagne", align: "HEEL" },
  { name: "Wes Barlow", nickname: null, align: "FACE" },
] as const;

async function main() {
  const existing = await db.world.findFirst({ where: { name: "Demo Universe" } });
  if (existing) {
    await db.world.delete({ where: { id: existing.id } });
    console.log("Removed the previous Demo Universe.");
  }

  const world = await db.world.create({ data: { name: "Demo Universe" } });

  const apex = await db.company.create({
    data: { worldId: world.id, name: "Apex Championship Wrestling", abbreviation: "ACW", color: "#3b82f6" },
  });
  const outlaw = await db.company.create({
    data: { worldId: world.id, name: "Outlaw Pro", abbreviation: "OP", color: "#d4a017" },
  });

  const wrestlers = await Promise.all(
    ROSTER.map((entry) =>
      db.wrestler.create({
        data: {
          worldId: world.id,
          name: entry.name,
          nickname: entry.nickname,
          align: entry.align,
        },
      }),
    ),
  );
  const by = (name: string) => wrestlers.find((w) => w.name === name)!;

  // Most of the roster is Apex; a few are Outlaw, and one works both — the
  // dual deal that makes crossover native.
  const apexRoster = ROSTER.slice(0, 8).map((r) => r.name);
  const outlawRoster = ROSTER.slice(8).map((r) => r.name);

  await db.contract.createMany({
    data: [
      ...apexRoster.map((name) => ({
        worldId: world.id,
        wrestlerId: by(name).id,
        companyId: apex.id,
        isPrimary: true,
        signedOn: parseISODate("2025-01-06"),
        expiresOn: parseISODate("2027-01-06"),
      })),
      ...outlawRoster.map((name) => ({
        worldId: world.id,
        wrestlerId: by(name).id,
        companyId: outlaw.id,
        isPrimary: true,
        signedOn: parseISODate("2025-03-01"),
        expiresOn: parseISODate("2026-03-01"),
      })),
      // Dual deal, plus one contract whose expiry has already passed so the
      // attention prompt has something to surface.
      {
        worldId: world.id,
        wrestlerId: by("Jonah Vance").id,
        companyId: outlaw.id,
        isPrimary: false,
        signedOn: parseISODate("2025-06-01"),
        expiresOn: parseISODate("2026-06-01"),
      },
    ],
  });

  const worldTitle = await db.title.create({
    data: { companyId: apex.id, name: "ACW World Championship" },
  });
  const tvTitle = await db.title.create({ data: { companyId: apex.id, name: "ACW Television Title" } });
  const outlawTitle = await db.title.create({ data: { companyId: outlaw.id, name: "Outlaw Crown" } });

  await db.weeklySeries.create({
    data: { companyId: apex.id, name: "ACW Frontline", cadence: "WEEKLY", startsOn: parseISODate("2026-01-05") },
  });
  await db.weeklySeries.create({
    data: { companyId: outlaw.id, name: "Outlaw Underground", cadence: "BIWEEKLY", startsOn: parseISODate("2026-01-09") },
  });

  async function playShow(input: {
    name: string;
    date: string;
    companyIds: string[];
    segments: {
      type: SegmentType;
      participants: string[];
      winners?: string[];
      titleId?: string;
      stipulation?: string;
      note?: string;
      resultNote?: string;
    }[];
  }) {
    const show = await db.show.create({
      data: {
        worldId: world.id,
        name: input.name,
        date: parseISODate(input.date),
        companies: { connect: input.companyIds.map((id) => ({ id })) },
        segments: {
          create: input.segments.map((segment, index) => ({
            order: index + 1,
            type: segment.type,
            note: segment.note,
            resultNote: segment.resultNote,
            stipulation: segment.stipulation,
            isTitleMatch: Boolean(segment.titleId),
            titleId: segment.titleId,
            participants: {
              create: segment.participants.map((name, order) => ({
                wrestlerId: by(name).id,
                order,
                isWinner: segment.winners?.includes(name) ?? false,
              })),
            },
          })),
        },
      },
    });

    await db.$transaction(async (tx) => {
      await applyTitleChanges(tx, show.id);
      await tx.show.update({ where: { id: show.id }, data: { isFinalized: true, playedAt: new Date() } });
    });
    return show;
  }

  await playShow({
    name: "ACW Cold Open",
    date: "2026-01-05",
    companyIds: [apex.id],
    segments: [
      {
        type: "PROMO",
        participants: ["Damien Cross"],
        note: "Declares the belt vacant and himself the rightful champion",
      },
      {
        type: "MATCH",
        participants: ["Rico Vega", "Kip Sullivan"],
        winners: ["Rico Vega"],
        resultNote: "Lightning DDT out of nowhere",
      },
      {
        type: "MATCH",
        participants: ["Damien Cross", "Buddy Kane"],
        winners: ["Damien Cross"],
        titleId: worldTitle.id,
        note: "Tournament final for the vacant title",
        resultNote: "Saint's Fall on the exposed floor",
      },
    ],
  });

  await playShow({
    name: "ACW Frontline #4",
    date: "2026-01-26",
    companyIds: [apex.id],
    segments: [
      {
        type: "MATCH",
        participants: ["Marcus Steele", "Nate Ruiz"],
        winners: ["Marcus Steele"],
        titleId: tvTitle.id,
        note: "Crowning the first TV champion",
      },
      { type: "BACKSTAGE", participants: ["Rico Vega", "Jonah Vance"], note: "Uneasy alliance forms" },
      {
        type: "MATCH",
        participants: ["Damien Cross", "Rico Vega"],
        winners: ["Damien Cross"],
        titleId: worldTitle.id,
        stipulation: "Steel Cage",
        resultNote: "Vic Malone slammed the cage door on Vega",
      },
    ],
  });

  await playShow({
    name: "Crossfire — ACW × Outlaw Pro",
    date: "2026-02-14",
    companyIds: [apex.id, outlaw.id],
    segments: [
      {
        type: "MATCH",
        participants: ["Andre Sol", "Jonah Vance"],
        winners: ["Andre Sol"],
        titleId: outlawTitle.id,
        note: "Outlaw Crown defended on neutral ground",
      },
      {
        type: "MATCH",
        participants: ["Rico Vega", "Damien Cross"],
        winners: ["Rico Vega"],
        titleId: worldTitle.id,
        stipulation: "No Disqualification",
        note: "Blow-off to their three-month issue",
        resultNote: "Vega Splash through the announce table, 3 count at ringside",
      },
    ],
  });

  // The future: booked, editable, counting for nothing until it is played.
  const future = await db.show.create({
    data: {
      worldId: world.id,
      name: "ACW Grand Slam",
      date: parseISODate("2026-09-19"),
      venue: "Riverside Arena",
      companies: { connect: [{ id: apex.id }] },
      notes: "The target the whole build points at.",
      segments: {
        create: [
          {
            order: 1,
            type: "MATCH",
            stipulation: "Ladder",
            note: "Steele's TV title on the line against the man he screwed in January",
            isTitleMatch: true,
            titleId: tvTitle.id,
            participants: {
              create: [
                { wrestlerId: by("Marcus Steele").id, order: 0 },
                { wrestlerId: by("Nate Ruiz").id, order: 1 },
              ],
            },
          },
          {
            order: 2,
            type: "CONTRACT_SIGNING",
            note: "Sets up the main event; ends in a brawl",
            participants: {
              create: [
                { wrestlerId: by("Rico Vega").id, order: 0 },
                { wrestlerId: by("Damien Cross").id, order: 1 },
              ],
            },
          },
          {
            order: 3,
            type: "MATCH",
            isTitleMatch: true,
            titleId: worldTitle.id,
            note: "Cross's rematch — booked eight months out, still rewritable",
            participants: {
              create: [
                { wrestlerId: by("Rico Vega").id, order: 0 },
                { wrestlerId: by("Damien Cross").id, order: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`Seeded "Demo Universe" (${world.id})`);
  console.log(`  Booked-ahead show: /shows/${future.id}`);
  console.log("  Switch to it from Settings.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
