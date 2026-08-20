/**
 * End-to-end check of the rules the spec cares most about, run against a
 * throwaway world that is deleted afterwards:
 *
 *   - booked matches count for nothing
 *   - playing a show is what moves records, reigns and head-to-heads
 *   - a title match closes one reign and opens the next, automatically
 *   - a successful defence leaves the reign alone
 *   - the past is immutable
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { applyTitleChanges } from "../src/lib/titles";
import { getHeadToHead, getRecord, getTitleHistory, getCalendar } from "../src/lib/derive";
import { parseISODate } from "../src/lib/dates";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

let passed = 0;
function check(label: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ✓ ${label}`);
}

async function play(showId: string) {
  await db.$transaction(async (tx) => {
    await applyTitleChanges(tx, showId);
    await tx.show.update({ where: { id: showId }, data: { isFinalized: true, playedAt: new Date() } });
  });
}

async function main() {
  const world = await db.world.create({ data: { name: `verify-${Date.now()}` } });

  try {
    const company = await db.company.create({ data: { worldId: world.id, name: "Verify Wrestling" } });
    const title = await db.title.create({ data: { companyId: company.id, name: "World Title" } });

    const [ace, rival, third] = await Promise.all(
      ["Ace", "Rival", "Third"].map((name) => db.wrestler.create({ data: { worldId: world.id, name } })),
    );

    // A show booked in the future with a title match on it.
    const showOne = await db.show.create({
      data: {
        worldId: world.id,
        name: "Night One",
        date: parseISODate("2026-01-10"),
        companies: { connect: [{ id: company.id }] },
        segments: {
          create: [
            {
              order: 1,
              type: "MATCH",
              isTitleMatch: true,
              titleId: title.id,
              participants: { create: [{ wrestlerId: ace.id, order: 0 }, { wrestlerId: rival.id, order: 1 }] },
            },
          ],
        },
      },
      include: { segments: true },
    });

    // Winners chosen but not yet finalized: still just a plan.
    await db.segmentParticipant.updateMany({
      where: { segmentId: showOne.segments[0].id, wrestlerId: ace.id },
      data: { isWinner: true },
    });

    const beforeRecord = await getRecord(ace.id);
    check("a booked match does not touch the record", () => {
      assert.equal(beforeRecord.matches, 0);
      assert.equal(beforeRecord.wins, 0);
    });

    const beforeTitle = await getTitleHistory(title.id);
    check("a booked title match does not open a reign", () => {
      assert.equal(beforeTitle?.reigns.length, 0);
      assert.equal(beforeTitle?.current, null);
    });

    await play(showOne.id);

    const afterRecord = await getRecord(ace.id);
    check("playing the show makes the win count", () => {
      assert.equal(afterRecord.wins, 1);
      assert.equal(afterRecord.losses, 0);
      assert.equal(afterRecord.matches, 1);
    });

    const rivalRecord = await getRecord(rival.id);
    check("the loser's record moves too", () => {
      assert.equal(rivalRecord.losses, 1);
      assert.equal(rivalRecord.wins, 0);
    });

    const afterTitle = await getTitleHistory(title.id);
    check("the first reign opens automatically", () => {
      assert.equal(afterTitle?.reigns.length, 1);
      assert.equal(afterTitle?.current?.holders[0].id, ace.id);
      assert.equal(afterTitle?.current?.startedOn.toISOString().slice(0, 10), "2026-01-10");
      assert.equal(afterTitle?.current?.wonAtShow?.name, "Night One");
    });

    // Night Two: a successful defence, then a different belt-less match.
    const showTwo = await db.show.create({
      data: {
        worldId: world.id,
        name: "Night Two",
        date: parseISODate("2026-02-10"),
        companies: { connect: [{ id: company.id }] },
        segments: {
          create: [
            {
              order: 1,
              type: "MATCH",
              isTitleMatch: true,
              titleId: title.id,
              participants: { create: [{ wrestlerId: ace.id, order: 0 }, { wrestlerId: third.id, order: 1 }] },
            },
          ],
        },
      },
      include: { segments: true },
    });
    await db.segmentParticipant.updateMany({
      where: { segmentId: showTwo.segments[0].id, wrestlerId: ace.id },
      data: { isWinner: true },
    });
    await play(showTwo.id);

    const defended = await getTitleHistory(title.id);
    check("a successful defence leaves the reign intact", () => {
      assert.equal(defended?.reigns.length, 1);
      assert.equal(defended?.current?.holders[0].id, ace.id);
      assert.equal(defended?.current?.startedOn.toISOString().slice(0, 10), "2026-01-10");
    });

    // Night Three: the belt changes hands.
    const showThree = await db.show.create({
      data: {
        worldId: world.id,
        name: "Night Three",
        date: parseISODate("2026-03-10"),
        companies: { connect: [{ id: company.id }] },
        segments: {
          create: [
            {
              order: 1,
              type: "MATCH",
              isTitleMatch: true,
              titleId: title.id,
              participants: { create: [{ wrestlerId: ace.id, order: 0 }, { wrestlerId: rival.id, order: 1 }] },
            },
          ],
        },
      },
      include: { segments: true },
    });
    await db.segmentParticipant.updateMany({
      where: { segmentId: showThree.segments[0].id, wrestlerId: rival.id },
      data: { isWinner: true },
    });
    await play(showThree.id);

    const changed = await getTitleHistory(title.id);
    check("a new champion closes the old reign and opens a new one", () => {
      assert.equal(changed?.reigns.length, 2);
      assert.equal(changed?.current?.holders[0].id, rival.id);
      const previous = changed!.reigns.find((r) => r.number === 1)!;
      assert.equal(previous.endedOn?.toISOString().slice(0, 10), "2026-03-10");
      assert.equal(previous.lostAtShow?.name, "Night Three");
      assert.equal(previous.days, 59); // 10 Jan to 10 Mar 2026
    });

    const h2h = await getHeadToHead(ace.id, rival.id);
    check("head-to-head is a query over played matches", () => {
      assert.equal(h2h.matches, 2);
      assert.equal(h2h.aWins, 1);
      assert.equal(h2h.bWins, 1);
      assert.equal(h2h.titleMatches, 2);
    });

    // A weekly series projects future episodes without storing them.
    const series = await db.weeklySeries.create({
      data: {
        companyId: company.id,
        name: "Weekly",
        cadence: "WEEKLY",
        startsOn: parseISODate("2026-04-01"),
      },
    });
    const april = await getCalendar(world.id, parseISODate("2026-04-01"), parseISODate("2026-04-30"));
    check("the calendar projects weekly episodes it never stored", () => {
      const slots = april.filter((entry) => entry.kind === "slot");
      assert.equal(slots.length, 5); // 1, 8, 15, 22, 29 April
      assert.equal(slots[0].name, "Weekly #1");
      assert.equal(slots[4].name, "Weekly #5");
      assert.equal(series.id, slots[0].seriesId);
    });

    const storedShows = await db.show.count({ where: { seriesId: series.id } });
    check("projected episodes create no rows until booked", () => {
      assert.equal(storedShows, 0);
    });

    // A show that was played is history and stays that way.
    const replayed = await db.show.findUniqueOrThrow({ where: { id: showThree.id } });
    check("played shows stay finalized", () => {
      assert.equal(replayed.isFinalized, true);
      assert.notEqual(replayed.playedAt, null);
    });
  } finally {
    await db.world.delete({ where: { id: world.id } });
    await db.$disconnect();
  }

  console.log(`\n${passed} checks passed.`);
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
