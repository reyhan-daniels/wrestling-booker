import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { SegmentType } from "@/generated/prisma/enums";
import { ALIGNMENT_LABELS, segmentTypeLabel } from "@/lib/constants";
import { formatDate, formatDuration } from "@/lib/dates";
import {
  formatRecord,
  getCurrentChampions,
  getHeadToHead,
  getMatchesFor,
  getTitleHistory,
  getTopOpponents,
  recordFrom,
  type MatchRow,
} from "@/lib/derive";
import type { PeekMatchLine, PeekPayload } from "@/components/peek/types";

// Backs the glance-don't-leave sheet: history is fetched *over* whatever card
// you are in the middle of building, so nothing you have typed is lost.

function matchLine(row: MatchRow, perspectiveId?: string): PeekMatchLine {
  const names = row.participants.map((p) => p.name).join(" vs ");
  const winners = row.participants.filter((p) => p.isWinner);

  let outcome: string | null = null;
  if (winners.length === 0) outcome = "No decision";
  else if (perspectiveId) {
    outcome = winners.some((w) => w.id === perspectiveId)
      ? "Win"
      : `Loss to ${winners.map((w) => w.name).join(" & ")}`;
  } else {
    outcome = `${winners.map((w) => w.name).join(" & ")} won`;
  }

  const bits = [row.stipulation, row.isTitleMatch ? row.titleName ?? "Title match" : null, row.resultNote]
    .filter(Boolean)
    .join(" · ");

  return {
    segmentId: row.segmentId,
    showId: row.showId,
    showName: row.showName,
    date: formatDate(row.date),
    line: names,
    outcome,
    detail: bits || null,
  };
}

async function wrestlerPayload(id: string): Promise<PeekPayload | null> {
  const wrestler = await db.wrestler.findUnique({
    where: { id },
    select: { id: true, name: true, nickname: true, align: true, status: true },
  });
  if (!wrestler) return null;

  const [rows, opponents, champions] = await Promise.all([
    getMatchesFor(id),
    getTopOpponents(id, 5),
    getCurrentChampions(),
  ]);

  const record = recordFrom(rows, id);
  const held = champions.filter((reign) => reign.holders.some((h) => h.id === id));

  return {
    kind: "wrestler",
    id,
    title: wrestler.name,
    subtitle: [
      wrestler.nickname,
      ALIGNMENT_LABELS[wrestler.align],
      wrestler.status === "RETIRED" ? "Retired" : null,
    ]
      .filter(Boolean)
      .join(" · "),
    record: formatRecord(record),
    matches: record.matches,
    href: `/roster/${id}`,
    reigns: held.map((reign) => ({
      id: reign.id,
      titleId: reign.title.id,
      label: reign.title.name,
      detail: `${reign.title.company.name} · ${formatDuration(reign.days)} · since ${formatDate(
        reign.startedOn,
      )}`,
    })),
    opponents: opponents.map((o) => ({
      id: o.id,
      name: o.name,
      summary: `${o.matches} match${o.matches === 1 ? "" : "es"} · ${o.wins}-${o.losses}`,
    })),
    recent: rows.slice(0, 8).map((row) => matchLine(row, id)),
  };
}

async function headToHeadPayload(a: string, b: string): Promise<PeekPayload | null> {
  const [left, right] = await Promise.all([
    db.wrestler.findUnique({ where: { id: a }, select: { name: true } }),
    db.wrestler.findUnique({ where: { id: b }, select: { name: true } }),
  ]);
  if (!left || !right) return null;

  const h2h = await getHeadToHead(a, b);

  return {
    kind: "headToHead",
    title: `${left.name} vs ${right.name}`,
    subtitle:
      h2h.matches === 0
        ? "They have never met"
        : `${h2h.matches} match${h2h.matches === 1 ? "" : "es"}`,
    aId: a,
    bId: b,
    summary: `${left.name} ${h2h.aWins} — ${h2h.bWins} ${right.name}${
      h2h.inconclusive ? ` · ${h2h.inconclusive} inconclusive` : ""
    }`,
    titleMatches: h2h.titleMatches,
    recent: h2h.rows.slice(0, 10).map((row) => matchLine(row)),
  };
}

async function titlePayload(id: string): Promise<PeekPayload | null> {
  const title = await getTitleHistory(id);
  if (!title) return null;

  return {
    kind: "title",
    id,
    title: title.name,
    subtitle: title.company.name,
    href: `/titles/${id}`,
    current: title.current
      ? `${title.current.holders.map((h) => h.name).join(" & ")} · ${formatDuration(title.current.days)}`
      : "Vacant — no reign yet",
    reigns: title.reigns.map((reign) => ({
      id: reign.id,
      number: reign.number,
      holders: reign.holders.map((h) => h.name).join(" & "),
      span: `${formatDate(reign.startedOn)} — ${reign.endedOn ? formatDate(reign.endedOn) : "present"}`,
      length: formatDuration(reign.days),
    })),
  };
}

async function showPayload(id: string): Promise<PeekPayload | null> {
  const show = await db.show.findUnique({
    where: { id },
    include: {
      companies: { select: { name: true } },
      segments: {
        orderBy: { order: "asc" },
        include: {
          title: { select: { name: true } },
          participants: { orderBy: { order: "asc" }, include: { wrestler: { select: { name: true } } } },
        },
      },
    },
  });
  if (!show) return null;

  return {
    kind: "show",
    id,
    title: show.name,
    subtitle: `${formatDate(show.date)} · ${show.companies.map((c) => c.name).join(" × ")}`,
    href: `/shows/${id}`,
    isFinalized: show.isFinalized,
    segments: show.segments.map((segment) => {
      const winners = segment.participants.filter((p) => p.isWinner);
      const isMatch = segment.type === SegmentType.MATCH;
      return {
        id: segment.id,
        label: segmentTypeLabel(segment.type, segment.customType),
        line: segment.participants.map((p) => p.wrestler.name).join(isMatch ? " vs " : ", ") || "—",
        outcome:
          show.isFinalized && isMatch
            ? winners.length
              ? `${winners.map((w) => w.wrestler.name).join(" & ")} won`
              : "No decision"
            : null,
        detail:
          [segment.stipulation, segment.isTitleMatch ? segment.title?.name ?? "Title match" : null, segment.resultNote, segment.note]
            .filter(Boolean)
            .join(" · ") || null,
      };
    }),
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const kind = params.get("kind");

  let payload: PeekPayload | null = null;
  if (kind === "wrestler") payload = await wrestlerPayload(String(params.get("id")));
  else if (kind === "headToHead")
    payload = await headToHeadPayload(String(params.get("a")), String(params.get("b")));
  else if (kind === "title") payload = await titlePayload(String(params.get("id")));
  else if (kind === "show") payload = await showPayload(String(params.get("id")));

  if (!payload) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(payload);
}
