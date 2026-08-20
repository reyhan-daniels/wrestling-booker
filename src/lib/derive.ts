// Derived views. Nothing in this file is stored — every number here is
// computed on demand from played shows. That is rule 1 of the spec: enter
// once, derive everything.
//
// One rule governs every query below: **finalized shows only**. A booked but
// unplayed match is a plan, not a result. It never moves a record, never
// changes a champion, never counts in a head-to-head.

import { db } from "@/lib/db";
import { SegmentType, Cadence } from "@/generated/prisma/enums";
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

export async function getCurrentChampions(companyId?: string) {
  const reigns = await db.reign.findMany({
    where: { endedOn: null, title: companyId ? { companyId } : undefined },
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
