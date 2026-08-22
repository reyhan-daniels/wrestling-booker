// Derived views. Nothing in this file is stored — every number here is
// computed on demand from played shows. That is rule 1 of the spec: enter
// once, derive everything.
//
// One rule governs every query below: **finalized shows only**. A booked but
// unplayed match is a plan, not a result. It never moves a record, never
// changes a champion, never counts in a head-to-head.

import { db } from "@/lib/db";
import { SegmentType, Cadence } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { addDays, addMonths, daysBetween, toISODate } from "@/lib/dates";

export type MatchRow = {
  segmentId: string;
  showId: string;
  showName: string;
  date: Date;
  companies: string[];
  stipulation: string | null;
  isTitleMatch: boolean;
  titleName: string | null;
  resultNote: string | null;
  participants: { id: string; name: string; isWinner: boolean }[];
};

export type WinLoss = {
  wins: number;
  losses: number;
  draws: number;
  matches: number;
};

const playedMatchInclude = {
  title: { select: { name: true } },
  show: { select: { id: true, name: true, date: true, companies: { select: { name: true } } } },
  participants: {
    orderBy: { order: "asc" },
    include: { wrestler: { select: { id: true, name: true } } },
  },
} as const;

type PlayedMatch = {
  id: string;
  stipulation: string | null;
  isTitleMatch: boolean;
  resultNote: string | null;
  title: { name: string } | null;
  show: { id: string; name: string; date: Date; companies: { name: string }[] };
  participants: { isWinner: boolean; wrestler: { id: string; name: string } }[];
};

function toRow(segment: PlayedMatch): MatchRow {
  return {
    segmentId: segment.id,
    showId: segment.show.id,
    showName: segment.show.name,
    date: segment.show.date,
    companies: segment.show.companies.map((c) => c.name),
    stipulation: segment.stipulation,
    isTitleMatch: segment.isTitleMatch,
    titleName: segment.title?.name ?? null,
    resultNote: segment.resultNote,
    participants: segment.participants.map((p) => ({
      id: p.wrestler.id,
      name: p.wrestler.name,
      isWinner: p.isWinner,
    })),
  };
}

/** Every played match a wrestler has been in, most recent first. */
export async function getMatchesFor(wrestlerId: string): Promise<MatchRow[]> {
  const segments = await db.segment.findMany({
    where: {
      type: SegmentType.MATCH,
      show: { isFinalized: true },
      participants: { some: { wrestlerId } },
    },
    include: playedMatchInclude,
    orderBy: [{ show: { date: "desc" } }, { order: "desc" }],
  });
  return segments.map(toRow);
}

/**
 * A match with no winner flagged is a draw / no-contest — that falls out of
 * the model for free rather than needing its own field.
 */
export function recordFrom(rows: MatchRow[], wrestlerId: string): WinLoss {
  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (const row of rows) {
    const decided = row.participants.some((p) => p.isWinner);
    if (!decided) draws += 1;
    else if (row.participants.some((p) => p.id === wrestlerId && p.isWinner)) wins += 1;
    else losses += 1;
  }

  return { wins, losses, draws, matches: rows.length };
}

export async function getRecord(wrestlerId: string): Promise<WinLoss> {
  return recordFrom(await getMatchesFor(wrestlerId), wrestlerId);
}

/** Records for a whole roster in one pass — used by the roster list. */
export async function getRecords(wrestlerIds: string[]): Promise<Map<string, WinLoss>> {
  const result = new Map<string, WinLoss>();
  if (wrestlerIds.length === 0) return result;

  const segments = await db.segment.findMany({
    where: {
      type: SegmentType.MATCH,
      show: { isFinalized: true },
      participants: { some: { wrestlerId: { in: wrestlerIds } } },
    },
    select: { participants: { select: { wrestlerId: true, isWinner: true } } },
  });

  for (const id of wrestlerIds) result.set(id, { wins: 0, losses: 0, draws: 0, matches: 0 });

  for (const segment of segments) {
    const decided = segment.participants.some((p) => p.isWinner);
    for (const p of segment.participants) {
      const record = result.get(p.wrestlerId);
      if (!record) continue;
      record.matches += 1;
      if (!decided) record.draws += 1;
      else if (p.isWinner) record.wins += 1;
      else record.losses += 1;
    }
  }

  return result;
}

export function formatRecord(record: WinLoss): string {
  return record.draws > 0
    ? `${record.wins}-${record.losses}-${record.draws}`
    : `${record.wins}-${record.losses}`;
}

/**
 * A rivalry is a query, not an entity. There is nothing to declare, open or
 * close — two names and the match history answers it.
 */
export async function getHeadToHead(aId: string, bId: string) {
  const segments = await db.segment.findMany({
    where: {
      type: SegmentType.MATCH,
      show: { isFinalized: true },
      AND: [
        { participants: { some: { wrestlerId: aId } } },
        { participants: { some: { wrestlerId: bId } } },
      ],
    },
    include: playedMatchInclude,
    orderBy: [{ show: { date: "desc" } }, { order: "desc" }],
  });

  const rows = segments.map(toRow);
  let aWins = 0;
  let bWins = 0;
  let inconclusive = 0;

  for (const row of rows) {
    const aWon = row.participants.some((p) => p.id === aId && p.isWinner);
    const bWon = row.participants.some((p) => p.id === bId && p.isWinner);
    // In a multi-man match neither of the pair may have won; that is not a
    // win for the other one.
    if (aWon && !bWon) aWins += 1;
    else if (bWon && !aWon) bWins += 1;
    else inconclusive += 1;
  }

  return {
    matches: rows.length,
    aWins,
    bWins,
    inconclusive,
    titleMatches: rows.filter((r) => r.isTitleMatch).length,
    rows,
  };
}

/** Who a wrestler has faced most, by played match count. */
export async function getTopOpponents(wrestlerId: string, limit = 6) {
  const rows = await getMatchesFor(wrestlerId);
  const tally = new Map<string, { id: string; name: string; matches: number; wins: number; losses: number }>();

  for (const row of rows) {
    const selfWon = row.participants.some((p) => p.id === wrestlerId && p.isWinner);
    const decided = row.participants.some((p) => p.isWinner);
    for (const p of row.participants) {
      if (p.id === wrestlerId) continue;
      const entry = tally.get(p.id) ?? { id: p.id, name: p.name, matches: 0, wins: 0, losses: 0 };
      entry.matches += 1;
      if (decided && selfWon) entry.wins += 1;
      else if (decided && p.isWinner) entry.losses += 1;
      tally.set(p.id, entry);
    }
  }

  return [...tally.values()].sort((a, b) => b.matches - a.matches).slice(0, limit);
}

// --- Titles -----------------------------------------------------------------

/** The spine of reigns. The current champion is the most recent open reign. */
export async function getTitleHistory(titleId: string) {
  const title = await db.title.findUnique({
    where: { id: titleId },
    include: {
      company: { select: { id: true, name: true } },
      reigns: {
        orderBy: [{ startedOn: "desc" }, { createdAt: "desc" }],
        include: {
          holders: { select: { id: true, name: true } },
          wonAtShow: { select: { id: true, name: true } },
          lostAtShow: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!title) return null;

  const today = new Date();
  const reigns = title.reigns.map((reign, index) => ({
    ...reign,
    // Reign numbers count up from the first, so index from the end.
    number: title.reigns.length - index,
    days: daysBetween(reign.startedOn, reign.endedOn ?? today),
    isCurrent: reign.endedOn === null,
  }));

  return { ...title, reigns, current: reigns.find((r) => r.isCurrent) ?? null };
}

export async function getCurrentChampions(companyId?: string, worldId?: string) {
  const reigns = await db.reign.findMany({
    where: {
      endedOn: null,
      // Without the world filter this returns champions from every save.
      title: { ...(companyId ? { companyId } : {}), company: { worldId } },
    },
    include: {
      holders: { select: { id: true, name: true } },
      title: { select: { id: true, name: true, companyId: true, company: { select: { name: true } } } },
    },
    orderBy: { startedOn: "asc" },
  });

  const today = new Date();
  return reigns.map((reign) => ({ ...reign, days: daysBetween(reign.startedOn, today) }));
}

// --- Calendar ---------------------------------------------------------------

export type CalendarEntry =
  | {
      kind: "show";
      id: string;
      date: Date;
      name: string;
      companies: { id: string; name: string; color: string | null }[];
      seriesId: string | null;
      isFinalized: boolean;
      segmentCount: number;
      /** Show colour, else its series', else the owning company's. */
      color: string | null;
    }
  | {
      kind: "slot";
      // A projected weekly episode that has never been opened. It has no row in
      // the database until you book it.
      id: string;
      date: Date;
      name: string;
      companies: { id: string; name: string; color: string | null }[];
      seriesId: string;
      color: string | null;
    };

function nextSlot(date: Date, cadence: Cadence): Date {
  if (cadence === Cadence.WEEKLY) return addDays(date, 7);
  if (cadence === Cadence.BIWEEKLY) return addDays(date, 14);
  return addMonths(date, 1);
}

/**
 * The calendar is a view, not a stored structure: real shows plus the slots a
 * weekly series implies. A slot is only a suggestion — nothing exists until
 * you book it.
 */
export async function getCalendar(worldId: string, from: Date, to: Date, companyId?: string) {
  const [shows, series] = await Promise.all([
    db.show.findMany({
      where: {
        worldId,
        date: { gte: from, lte: to },
        ...(companyId ? { companies: { some: { id: companyId } } } : {}),
      },
      include: {
        companies: { select: { id: true, name: true, color: true } },
        series: { select: { color: true } },
        _count: { select: { segments: true } },
      },
      orderBy: { date: "asc" },
    }),
    db.weeklySeries.findMany({
      where: {
        company: { worldId, ...(companyId ? { id: companyId } : {}) },
        OR: [{ endedOn: null }, { endedOn: { gte: from } }],
      },
      include: { company: { select: { id: true, name: true, color: true } } },
    }),
  ]);

  const entries: CalendarEntry[] = shows.map((show) => ({
    kind: "show",
    id: show.id,
    date: show.date,
    name: show.name,
    companies: show.companies,
    seriesId: show.seriesId,
    isFinalized: show.isFinalized,
    segmentCount: show._count.segments,
    color: show.color ?? show.series?.color ?? show.companies[0]?.color ?? null,
  }));

  const taken = new Set(shows.filter((s) => s.seriesId).map((s) => `${s.seriesId}:${toISODate(s.date)}`));

  for (const s of series) {
    let cursor = s.startsOn;
    let episode = 1;
    // Walk forward from the anchor so the episode number is derived, never typed.
    let guard = 0;
    while (cursor < from && guard++ < 5000) {
      cursor = nextSlot(cursor, s.cadence);
      episode += 1;
    }
    while (cursor <= to && (!s.endedOn || cursor <= s.endedOn) && guard++ < 5000) {
      const key = `${s.id}:${toISODate(cursor)}`;
      if (!taken.has(key)) {
        entries.push({
          kind: "slot",
          id: key,
          date: cursor,
          name: `${s.name} #${episode}`,
          companies: [s.company],
          seriesId: s.id,
          color: s.color ?? s.company.color ?? null,
        });
      }
      cursor = nextSlot(cursor, s.cadence);
      episode += 1;
    }
  }

  return entries.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** The next episode number a series would use on a given date. */
export async function episodeNumberFor(seriesId: string, date: Date) {
  const series = await db.weeklySeries.findUnique({ where: { id: seriesId } });
  if (!series) return null;
  let cursor = series.startsOn;
  let episode = 1;
  let guard = 0;
  while (cursor < date && guard++ < 5000) {
    cursor = nextSlot(cursor, series.cadence);
    episode += 1;
  }
  return episode;
}

// --- Attention prompts ------------------------------------------------------

/**
 * A flag is a prompt, never an event. This only reports that a date has
 * passed; nothing changes until you choose what to do about it.
 */
export async function getExpiredContracts(worldId: string, asOf = new Date()) {
  return db.contract.findMany({
    where: { worldId, endedOn: null, expiresOn: { not: null, lt: asOf } },
    include: {
      wrestler: { select: { id: true, name: true, status: true } },
      company: { select: { id: true, name: true } },
    },
    orderBy: { expiresOn: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Units — tag teams, trios and factions
// ---------------------------------------------------------------------------

// `unitKind` — the one derivation here a client component needs — lives in
// constants.ts instead, because this module reaches the database and would
// drag the driver into the browser bundle.

/**
 * A unit's matches: played matches where *every* member appeared and shared
 * an outcome. Members on opposite sides are not the unit working — that is
 * the unit imploding, and it counts for neither side.
 */
export async function getUnitMatches(memberIds: string[]): Promise<MatchRow[]> {
  if (memberIds.length < 2) return [];

  const segments = await db.segment.findMany({
    where: {
      type: SegmentType.MATCH,
      show: { isFinalized: true },
      // Cheap prefilter; the all-members test has to happen in memory anyway.
      participants: { some: { wrestlerId: { in: memberIds } } },
    },
    include: playedMatchInclude,
    orderBy: [{ show: { date: "desc" } }, { order: "asc" }],
  });

  return segments
    .filter((segment) => {
      const mine = segment.participants.filter((p) => memberIds.includes(p.wrestler.id));
      if (mine.length !== memberIds.length) return false;
      return mine.every((p) => p.isWinner === mine[0].isWinner);
    })
    .map(toRow);
}

export function unitRecordFrom(rows: MatchRow[], memberIds: string[]): WinLoss {
  let wins = 0;
  let losses = 0;
  let draws = 0;

  for (const row of rows) {
    // Same test as an individual record: a match nobody won is a draw, not a
    // loss for everyone in it.
    const decided = row.participants.some((p) => p.isWinner);
    if (!decided) draws += 1;
    else if (row.participants.some((p) => memberIds.includes(p.id) && p.isWinner)) wins += 1;
    else losses += 1;
  }

  return { wins, losses, draws, matches: rows.length };
}

export async function getUnitRecord(memberIds: string[]): Promise<WinLoss> {
  return unitRecordFrom(await getUnitMatches(memberIds), memberIds);
}

// ---------------------------------------------------------------------------
// Tournaments — standings and brackets, counted rather than stored
// ---------------------------------------------------------------------------
//
// A tournament stores its field and its scoring. Everything you actually want
// to look at — points, order, who has advanced, who is still to come — is
// counted here from the matches, so there is no standings table to fall out of
// step with a result, and correcting a winner corrects the table.

export type Competitor = {
  entrantId: string;
  /** A wrestler is one id; a unit is all of its members. */
  memberIds: string[];
  name: string;
  block: string | null;
  isUnit: boolean;
};

export type Standing = Competitor & {
  played: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
};

type TournamentSegment = {
  id: string;
  tournamentRound: number | null;
  show: { id: string; name: string; date: Date; isFinalized: boolean };
  participants: { isWinner: boolean; wrestler: { id: string; name: string } }[];
};

/**
 * How one competitor fared in one match. `null` means they were not in it —
 * and for a unit, "not in it" includes the case where its members were split
 * across both sides, which is the unit imploding rather than competing.
 */
export function outcomeFor(
  segment: TournamentSegment,
  competitor: Competitor,
): "win" | "loss" | "draw" | null {
  const mine = segment.participants.filter((p) => competitor.memberIds.includes(p.wrestler.id));
  if (mine.length !== competitor.memberIds.length) return null;
  if (!mine.every((p) => p.isWinner === mine[0].isWinner)) return null;

  const decided = segment.participants.some((p) => p.isWinner);
  if (!decided) return "draw";
  return mine[0].isWinner ? "win" : "loss";
}

export function competitorsOf(tournament: {
  entrants: {
    id: string;
    block: string | null;
    wrestler: { id: string; name: string } | null;
    group: { id: string; name: string; members: { id: string }[] } | null;
  }[];
}): Competitor[] {
  return tournament.entrants.flatMap<Competitor>((entrant) => {
    if (entrant.wrestler) {
      return [{
        entrantId: entrant.id,
        memberIds: [entrant.wrestler.id],
        name: entrant.wrestler.name,
        block: entrant.block,
        isUnit: false,
      }];
    }
    if (entrant.group) {
      return [{
        entrantId: entrant.id,
        memberIds: entrant.group.members.map((m) => m.id),
        name: entrant.group.name,
        block: entrant.block,
        isUnit: true,
      }];
    }
    // The database forbids this, but the type does not.
    return [];
  });
}

/**
 * League table. Only finalized shows count — a booked match is a fixture, not
 * a result, so it moves nobody up the table.
 */
export function standingsFrom(
  competitors: Competitor[],
  segments: TournamentSegment[],
  scoring: { pointsWin: number; pointsDraw: number },
): Standing[] {
  const played = segments.filter((s) => s.show.isFinalized);

  return competitors
    .map((competitor) => {
      let wins = 0;
      let losses = 0;
      let draws = 0;
      for (const segment of played) {
        const outcome = outcomeFor(segment, competitor);
        if (outcome === "win") wins += 1;
        else if (outcome === "loss") losses += 1;
        else if (outcome === "draw") draws += 1;
      }
      return {
        ...competitor,
        played: wins + losses + draws,
        wins,
        losses,
        draws,
        points: wins * scoring.pointsWin + draws * scoring.pointsDraw,
      };
    })
    .sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name));
}

/** Standings split into the blocks the entrants were assigned to. */
export function blocksFrom(standings: Standing[]): { block: string | null; standings: Standing[] }[] {
  const names = [...new Set(standings.map((s) => s.block))].sort((a, b) =>
    a === null ? -1 : b === null ? 1 : a.localeCompare(b),
  );
  return names.map((block) => ({ block, standings: standings.filter((s) => s.block === block) }));
}

export type BracketRound = {
  round: number;
  segments: TournamentSegment[];
  /** Named from the end, so the last round is always the final. */
  label: string;
  winners: Competitor[];
  isComplete: boolean;
};

/**
 * The bracket as booked. Rounds are whatever rounds have matches in them —
 * nothing is generated ahead of time, because generating a round would be the
 * tool booking a match on your behalf.
 */
export function bracketFrom(
  competitors: Competitor[],
  segments: TournamentSegment[],
  label: (round: number, total: number) => string,
): { rounds: BracketRound[]; advancing: Competitor[]; nextRound: number } {
  const rounds = [...new Set(segments.map((s) => s.tournamentRound ?? 1))].sort((a, b) => a - b);
  // The size of the field says how many rounds it *should* take, so a final
  // can be called a final before the semi-finals have been booked.
  const expected = competitors.length > 1 ? Math.ceil(Math.log2(competitors.length)) : 1;
  const total = Math.max(expected, rounds.at(-1) ?? 1);

  const built = rounds.map((round) => {
    const inRound = segments.filter((s) => (s.tournamentRound ?? 1) === round);
    const winners = competitors.filter((competitor) =>
      inRound.some((segment) => segment.show.isFinalized && outcomeFor(segment, competitor) === "win"),
    );
    return {
      round,
      segments: inRound,
      label: label(round, total),
      winners,
      isComplete: inRound.length > 0 && inRound.every((s) => s.show.isFinalized),
    };
  });

  // Who is waiting on a match that has not been booked yet. This is a prompt,
  // never an action: the tool will not book the next round for you.
  const last = built.at(-1);
  const nextRound = (last?.round ?? 0) + 1;
  const advancing = last?.isComplete ? last.winners : [];

  return { rounds: built, advancing, nextRound };
}

export const tournamentInclude = {
  entrants: {
    orderBy: { order: "asc" },
    include: {
      wrestler: { select: { id: true, name: true } },
      group: { select: { id: true, name: true, members: { select: { id: true } } } },
    },
  },
  segments: {
    include: {
      show: { select: { id: true, name: true, date: true, isFinalized: true } },
      participants: {
        orderBy: { order: "asc" },
        include: { wrestler: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ show: { date: "asc" } }, { order: "asc" }],
  },
} satisfies Prisma.TournamentInclude;

/**
 * A league's matches split in two. Block matches carry no round; a playoff
 * match does, which lets the same bracket machinery read both formats.
 */
export function splitLeague<T extends { tournamentRound: number | null }>(segments: T[]) {
  return {
    blockStage: segments.filter((s) => s.tournamentRound === null),
    playoff: segments.filter((s) => s.tournamentRound !== null),
  };
}

export type Qualification = {
  /** Who would go through as the table stands. */
  qualifiers: Competitor[];
  /** Every booked block match has been played. */
  blocksFinished: boolean;
  label: string;
};

/**
 * Who a league's playoff would be contested between. Read off the table, so it
 * updates the moment a result does — and it is only ever a statement about the
 * standings. Booking the playoff is still yours to do.
 */
export function qualifiersFrom(
  blocks: { block: string | null; standings: Standing[] }[],
  segments: { tournamentRound: number | null; show: { isFinalized: boolean } }[],
  playoff: string,
): Qualification {
  const { blockStage } = splitLeague(segments);
  const blocksFinished = blockStage.length > 0 && blockStage.every((s) => s.show.isFinalized);

  const topOf = (n: number) => blocks.flatMap(({ standings }) => standings.slice(0, n));
  const overall = (n: number) =>
    blocks
      .flatMap(({ standings }) => standings)
      .sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name))
      .slice(0, n);

  switch (playoff) {
    case "BLOCK_WINNERS":
      return { qualifiers: topOf(1), blocksFinished, label: "Final" };
    case "TOP_TWO_PER_BLOCK":
      return { qualifiers: topOf(2), blocksFinished, label: "Semi-finals" };
    case "TOP_FOUR_OVERALL":
      return { qualifiers: overall(4), blocksFinished, label: "Semi-finals" };
    case "TOP_EIGHT_OVERALL":
      return { qualifiers: overall(8), blocksFinished, label: "Quarter-finals" };
    default:
      return { qualifiers: [], blocksFinished, label: "" };
  }
}

/**
 * Every tournament a wrestler (or a unit) has been part of, with how they
 * placed. Placement is counted from the table, never recorded — so a corrected
 * result moves them up or down here too.
 */
export async function getTournamentHistory(memberIds: string[], worldId: string) {
  if (memberIds.length === 0) return [];

  const tournaments = await db.tournament.findMany({
    where: {
      worldId,
      entrants: {
        some: memberIds.length === 1
          ? { OR: [{ wrestlerId: memberIds[0] }, { group: { members: { some: { id: memberIds[0] } } } }] }
          : { group: { members: { every: { id: { in: memberIds } } } } },
      },
    },
    include: tournamentInclude,
    orderBy: [{ startsOn: "desc" }, { createdAt: "desc" }],
  });

  return tournaments.map((tournament) => {
    const competitors = competitorsOf(tournament);
    const { blockStage } = splitLeague(tournament.segments);
    const counted =
      tournament.format === "ROUND_ROBIN" && blockStage.length > 0 ? blockStage : tournament.segments;
    const table = standingsFrom(competitors, counted, tournament);

    // Which row is "theirs" — their own, or the unit they were in.
    const mine = table.find((row) => row.memberIds.some((id) => memberIds.includes(id)));
    const block = mine?.block ?? null;
    const within = block === null ? table : table.filter((row) => row.block === block);

    return {
      id: tournament.id,
      name: tournament.name,
      format: tournament.format,
      isComplete: tournament.isComplete,
      startsOn: tournament.startsOn,
      block,
      as: mine?.name ?? null,
      isUnit: mine?.isUnit ?? false,
      place: mine ? within.findIndex((row) => row.entrantId === mine.entrantId) + 1 : null,
      of: within.length,
      record: mine ? { wins: mine.wins, losses: mine.losses, draws: mine.draws } : null,
      points: mine?.points ?? 0,
    };
  });
}
