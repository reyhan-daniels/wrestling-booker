/**
 * End-to-end check of the rules the spec cares most about, run against a
 * throwaway world that is deleted afterwards:
 *
 *   - booked matches count for nothing
 *   - playing a show is what moves records, reigns and head-to-heads
 *   - a title match closes one reign and opens the next, automatically
 *   - a successful defence leaves the reign alone
 *   - the past is immutable
 *   - a unit's kind and record are derived, never stored
 *   - tournament standings and brackets are counted, never stored
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { applyTitleChanges } from "../src/lib/titles";
import { getHeadToHead, getRecord, getTitleHistory, getCalendar, getUnitMatches, unitRecordFrom, tournamentInclude } from "../src/lib/derive";
import { bracketFrom, competitorsOf, standingsFrom } from "../src/lib/derive";
import { roundName, unitKind } from "../src/lib/constants";
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

    // --- units: tag teams, trios and factions ------------------------------
    //
    // Night Four is a genuine tag match: Ace and Third on one side, Rival and
    // Fourth on the other. Note that Ace and Third have *also* wrestled each
    // other (Night Two), which is exactly the case a unit record must ignore.
    const fourth = await db.wrestler.create({ data: { worldId: world.id, name: "Fourth" } });
    const showFour = await db.show.create({
      data: {
        worldId: world.id,
        name: "Night Four",
        date: parseISODate("2026-04-10"),
        companies: { connect: [{ id: company.id }] },
        segments: {
          create: [
            {
              order: 1,
              type: "MATCH",
              participants: {
                create: [
                  { wrestlerId: ace.id, order: 0 },
                  { wrestlerId: third.id, order: 1 },
                  { wrestlerId: rival.id, order: 2 },
                  { wrestlerId: fourth.id, order: 3 },
                ],
              },
            },
          ],
        },
      },
      include: { segments: true },
    });
    await db.segmentParticipant.updateMany({
      where: { segmentId: showFour.segments[0].id, wrestlerId: { in: [ace.id, third.id] } },
      data: { isWinner: true },
    });

    const teamIds = [ace.id, third.id];
    const bookedRows = await getUnitMatches(teamIds);
    check("a booked tag match gives the unit nothing", () => {
      assert.equal(bookedRows.length, 0);
    });

    await play(showFour.id);

    const team = await db.group.create({
      data: { worldId: world.id, name: "The Pairing", members: { connect: [{ id: ace.id }, { id: third.id }] } },
    });

    check("a unit's kind is its size, not a stored field", () => {
      assert.equal(unitKind(2), "Tag team");
      assert.equal(unitKind(3), "Trio");
      assert.equal(unitKind(7), "Faction");
      // Nothing on the row says which it is.
      assert.equal("kind" in team, false);
    });

    const teamRecord = unitRecordFrom(await getUnitMatches(teamIds), teamIds);
    check("a unit's record counts only matches with everyone on the same side", () => {
      // Night Two had both men in it, on opposite sides. It is not counted.
      assert.equal(teamRecord.matches, 1);
      assert.equal(teamRecord.wins, 1);
      assert.equal(teamRecord.losses, 0);
    });

    const losingIds = [rival.id, fourth.id];
    const losingRecord = unitRecordFrom(await getUnitMatches(losingIds), losingIds);
    check("the beaten pair takes the loss as a unit", () => {
      assert.equal(losingRecord.matches, 1);
      assert.equal(losingRecord.losses, 1);
    });

    const opposedIds = [ace.id, rival.id];
    const opposedRecord = unitRecordFrom(await getUnitMatches(opposedIds), opposedIds);
    check("a pair who have only ever fought each other has no record", () => {
      assert.equal(opposedRecord.matches, 0);
    });

    // Adding a member is the only thing that turns a tag team into a trio.
    await db.group.update({ where: { id: team.id }, data: { members: { connect: [{ id: rival.id }] } } });
    const grown = await db.group.findUniqueOrThrow({
      where: { id: team.id },
      include: { members: { select: { id: true } } },
    });
    check("adding a member re-derives the kind with no field to update", () => {
      assert.equal(unitKind(grown.members.length), "Trio");
    });

    // --- tournaments -------------------------------------------------------
    //
    // A four-man league whose matches are the ones already played above, plus
    // one still to come. Standings must count only what has been played.
    const league = await db.tournament.create({
      data: {
        worldId: world.id,
        name: "Verify Cup",
        format: "ROUND_ROBIN",
        entrants: {
          create: [
            { wrestlerId: ace.id, block: "A", order: 0 },
            { wrestlerId: rival.id, block: "A", order: 1 },
            { wrestlerId: third.id, block: "B", order: 2 },
            { wrestlerId: fourth.id, block: "B", order: 3 },
          ],
        },
      },
    });

    // Night One (Ace beat Rival) and Night Three (Rival beat Ace) are league
    // matches; a fifth, unplayed, is booked.
    await db.segment.updateMany({
      where: { showId: { in: [showOne.id, showThree.id] } },
      data: { tournamentId: league.id },
    });
    const pending = await db.show.create({
      data: {
        worldId: world.id,
        name: "Night Five",
        date: parseISODate("2026-05-10"),
        companies: { connect: [{ id: company.id }] },
        segments: {
          create: [
            {
              order: 1,
              type: "MATCH",
              tournamentId: league.id,
              participants: {
                create: [{ wrestlerId: third.id, order: 0 }, { wrestlerId: fourth.id, order: 1 }],
              },
            },
          ],
        },
      },
      include: { segments: true },
    });
    // Give the unplayed match a winner it has no business having yet.
    await db.segmentParticipant.updateMany({
      where: { segmentId: pending.segments[0].id, wrestlerId: third.id },
      data: { isWinner: true },
    });

    const loaded = await db.tournament.findUniqueOrThrow({
      where: { id: league.id },
      include: tournamentInclude,
    });
    const field = competitorsOf(loaded);
    const table = standingsFrom(field, loaded.segments, loaded);

    check("a league table counts only played matches", () => {
      const third_ = table.find((row) => row.name === "Third")!;
      // Third's only league match is booked, not played.
      assert.equal(third_.played, 0);
      assert.equal(third_.points, 0);
    });

    check("points come from the tournament's own scoring", () => {
      const aceRow = table.find((row) => row.name === "Ace")!;
      const rivalRow = table.find((row) => row.name === "Rival")!;
      assert.equal(aceRow.wins, 1);
      assert.equal(aceRow.losses, 1);
      assert.equal(aceRow.points, 2); // one win at the default 2
      assert.equal(rivalRow.points, 2);
    });

    check("blocks come off the entrants, not a stored table", () => {
      assert.deepEqual(
        table.filter((row) => row.block === "A").map((row) => row.name).sort(),
        ["Ace", "Rival"],
      );
    });

    // The same matches read as a bracket when the format says so.
    await db.tournament.update({ where: { id: league.id }, data: { format: "SINGLE_ELIMINATION" } });
    await db.segment.updateMany({ where: { showId: showOne.id }, data: { tournamentRound: 1 } });
    await db.segment.updateMany({ where: { showId: showThree.id }, data: { tournamentRound: 2 } });
    await db.segment.updateMany({ where: { showId: pending.id }, data: { tournamentRound: 3 } });

    const asBracket = await db.tournament.findUniqueOrThrow({
      where: { id: league.id },
      include: tournamentInclude,
    });
    const bracket = bracketFrom(competitorsOf(asBracket), asBracket.segments, roundName);

    check("a bracket is read off the rounds that were booked", () => {
      assert.deepEqual(bracket.rounds.map((r) => r.round), [1, 2, 3]);
      assert.equal(bracket.rounds[0].winners.map((w) => w.name).join(), "Ace");
      assert.equal(bracket.rounds[1].winners.map((w) => w.name).join(), "Rival");
    });

    check("an unplayed round advances nobody", () => {
      // Round 3 has a winner flagged but its show is not finalized.
      assert.equal(bracket.rounds[2].isComplete, false);
      assert.equal(bracket.rounds[2].winners.length, 0);
      assert.equal(bracket.advancing.length, 0);
    });

    check("the last round is named the final, whatever its number", () => {
      assert.equal(roundName(3, 3), "Final");
      assert.equal(roundName(2, 3), "Semi-finals");
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
