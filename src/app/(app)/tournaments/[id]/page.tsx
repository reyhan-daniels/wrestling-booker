import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, toISODate } from "@/lib/dates";
import { PLAYOFF_LABELS, TOURNAMENT_FORMAT_LABELS, roundName } from "@/lib/constants";
import {
  bracketFrom,
  blocksFrom,
  competitorsOf,
  qualifiersFrom,
  splitLeague,
  standingsFrom,
  tournamentInclude,
} from "@/lib/derive";
import { BackLink, Empty, PageHeader, StateChip } from "@/components/ui";
import { PeekShowButton } from "@/components/peek/peek-triggers";

export default async function TournamentPage({ params }: PageProps<"/tournaments/[id]">) {
  const { id } = await params;
  const tournament = await db.tournament.findUnique({ where: { id }, include: tournamentInclude });
  if (!tournament) notFound();

  const competitors = competitorsOf(tournament);
  const segments = tournament.segments;
  const playedCount = segments.filter((s) => s.show.isFinalized).length;

  const isLeague = tournament.format === "ROUND_ROBIN";

  // In a league, a match flagged as a playoff match is kept out of the table —
  // that is what stops a semi-final win inflating the blocks.
  const { blockStage, playoff: playoffSegments } = splitLeague(segments);
  const counted = isLeague ? blockStage : segments;

  const standings = standingsFrom(competitors, counted, tournament);
  const blocks = blocksFrom(standings);
  const qualification = qualifiersFrom(blocks, segments, tournament.playoff);
  const bracket = bracketFrom(
    isLeague ? qualification.qualifiers : competitors,
    isLeague ? playoffSegments : segments,
    roundName,
  );

  // Where a new tournament match would be booked from — dated after the last
  // match it had, since that is where the next round goes. Nothing is created
  // here: this is a link to the booking screen, not a shortcut past it.
  const bookHref = `/shows/new?date=${toISODate(segments.at(-1)?.show.date ?? new Date())}${
    tournament.companyId ? `&company=${tournament.companyId}` : ""
  }`;

  return (
    <div className="mx-auto max-w-5xl">
      <BackLink href="/tournaments">Tournaments</BackLink>
      <PageHeader
        title={tournament.name}
        subtitle={[
          TOURNAMENT_FORMAT_LABELS[tournament.format],
          `${competitors.length} entrants`,
          tournament.isComplete ? "Concluded" : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={<Link href={`/tournaments/${id}/edit`} className="btn-ghost">Edit</Link>}
      />

      <p className="mb-4 text-sm text-ink-500">
        {playedCount} of {segments.length} booked match{segments.length === 1 ? "" : "es"} played.
        {segments.length === 0 && (
          <>
            {" "}Book a match on any show and tag it into this tournament —{" "}
            <Link href={bookHref} className="text-plan-300 underline">start a show</Link>.
          </>
        )}
      </p>

      {isLeague ? (
        <div className="space-y-4">
          <div className={blocks.length > 1 ? "grid gap-4 lg:grid-cols-2" : ""}>
            {blocks.map(({ block, standings: table }) => (
              <section key={block ?? "single"} className="card p-4">
                <p className="section-title mb-3">{block ? `Block ${block}` : "Standings"}</p>
                <Table rows={table} pointsWin={tournament.pointsWin} pointsDraw={tournament.pointsDraw} />
              </section>
            ))}
          </div>

          {tournament.playoff !== "NONE" && (
            <section className="card border-plan-500/40 bg-plan-500/5 p-4">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <p className="section-title">{qualification.label}</p>
                <span className="display text-[10px] tracking-widest text-ink-500">
                  {PLAYOFF_LABELS[tournament.playoff]}
                </span>
              </div>
              {qualification.qualifiers.length === 0 ? (
                <p className="text-sm text-ink-400">Nobody has played a block match yet.</p>
              ) : (
                <>
                  <p className="text-sm text-ink-200">
                    {qualification.qualifiers.map((c) => c.name).join(" · ")}
                  </p>
                  <p className="mt-2 text-xs text-ink-500">
                    {qualification.blocksFinished
                      ? "Blocks are done — book the playoff on a show and tick Playoff match."
                      : "As the table stands. Block matches are still to be played."}
                  </p>
                </>
              )}
            </section>
          )}

          {playoffSegments.length > 0 &&
            bracket.rounds.map((round) => (
              <section key={round.round} className="card p-4">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <p className="section-title">{round.label}</p>
                  <span className="display text-[10px] tracking-widest text-ink-500">
                    {round.isComplete
                      ? "Complete"
                      : `${round.segments.filter((s) => s.show.isFinalized).length} of ${round.segments.length} played`}
                  </span>
                </div>
                <MatchList segments={round.segments} />
              </section>
            ))}
        </div>
      ) : (
        <div className="space-y-4">
          {bracket.rounds.length === 0 ? (
            <Empty>
              No matches booked yet. The bracket is read off the matches — book the
              first round and it appears.
            </Empty>
          ) : (
            bracket.rounds.map((round) => (
              <section key={round.round} className="card p-4">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <p className="section-title">{round.label}</p>
                  <span className="display text-[10px] tracking-widest text-ink-500">
                    {round.isComplete ? "Complete" : `${round.segments.filter((s) => s.show.isFinalized).length} of ${round.segments.length} played`}
                  </span>
                </div>
                <MatchList segments={round.segments} />
              </section>
            ))
          )}

          {bracket.advancing.length > 0 && (
            <section className="card border-plan-500/40 bg-plan-500/5 p-4">
              <p className="section-title mb-2">
                {bracket.advancing.length === 1 ? "Winner" : `Through to ${roundName(bracket.nextRound, Math.max(bracket.nextRound, Math.ceil(Math.log2(Math.max(competitors.length, 2)))))}`}
              </p>
              <p className="text-sm text-ink-200">
                {bracket.advancing.map((c) => c.name).join(" · ")}
              </p>
              {bracket.advancing.length > 1 && (
                <p className="mt-2 text-xs text-ink-500">
                  Nothing has been booked for them — that is yours to do.{" "}
                  <Link href={bookHref} className="text-plan-300 underline">Book the next round.</Link>
                </p>
              )}
            </section>
          )}
        </div>
      )}

      <section className="card mt-4 p-4">
        <p className="section-title mb-3">All matches</p>
        {segments.length === 0 ? (
          <Empty>Nothing tagged into this tournament yet.</Empty>
        ) : (
          <ul className="space-y-1.5">
            {segments.map((segment) => (
              <li key={segment.id} className="flex items-baseline justify-between gap-2 rounded-lg border border-ink-800 bg-ink-900 px-3 py-2">
                <span className="min-w-0 truncate text-sm">
                  {segment.participants.map((p) => p.wrestler.name).join(" vs ")}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <Link href={`/shows/${segment.show.id}`} className="text-xs text-ink-500 hover:text-plan-300">
                    {formatDate(segment.show.date)}
                  </Link>
                  <StateChip isFinalized={segment.show.isFinalized} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {tournament.notes && (
        <section className="card mt-4 p-4">
          <p className="section-title mb-2">Notes</p>
          <p className="text-sm text-ink-400">{tournament.notes}</p>
        </section>
      )}
    </div>
  );
}

type ListSegment = {
  id: string;
  show: { id: string; name: string; date: Date; isFinalized: boolean };
  participants: { isWinner: boolean; wrestler: { id: string; name: string } }[];
};

function MatchList({ segments }: { segments: ListSegment[] }) {
  return (
    <ul className="space-y-1.5">
      {segments.map((segment) => (
        <li key={segment.id} className="rounded-lg border border-ink-800 bg-ink-900 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm">
              {segment.participants.map((p) => p.wrestler.name).join(" vs ")}
            </span>
            <StateChip isFinalized={segment.show.isFinalized} />
          </div>
          <p className="mt-1 text-xs text-ink-500">
            <PeekShowButton id={segment.show.id} className="underline decoration-dotted underline-offset-2">
              {segment.show.name}
            </PeekShowButton>{" "}
            · {formatDate(segment.show.date)}
            {segment.show.isFinalized && (
              <>
                {" · won by "}
                <span className="text-played-300">
                  {segment.participants.filter((p) => p.isWinner).map((p) => p.wrestler.name).join(" & ") ||
                    "nobody"}
                </span>
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Table({
  rows,
  pointsWin,
  pointsDraw,
}: {
  rows: ReturnType<typeof standingsFrom>;
  pointsWin: number;
  pointsDraw: number;
}) {
  if (rows.length === 0) return <Empty>Nobody in this block.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[24rem] text-sm">
        <thead>
          <tr className="display text-[10px] tracking-widest text-ink-500">
            <th className="pb-2 text-left font-normal">Entrant</th>
            <th className="pb-2 text-right font-normal">P</th>
            <th className="pb-2 text-right font-normal">W</th>
            <th className="pb-2 text-right font-normal">L</th>
            <th className="pb-2 text-right font-normal">D</th>
            <th className="pb-2 text-right font-normal">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.entrantId} className="border-t border-ink-800">
              <td className="py-2 pr-2">
                <span className="tabular-nums text-ink-600">{index + 1}.</span>{" "}
                <span className={index === 0 && row.played > 0 ? "text-played-300" : undefined}>{row.name}</span>
                {row.isUnit && <span className="ml-1.5 chip-muted">Unit</span>}
              </td>
              <td className="py-2 text-right tabular-nums text-ink-400">{row.played}</td>
              <td className="py-2 text-right tabular-nums">{row.wins}</td>
              <td className="py-2 text-right tabular-nums text-ink-400">{row.losses}</td>
              <td className="py-2 text-right tabular-nums text-ink-400">{row.draws}</td>
              <td className="stat py-2 text-right text-ink-100">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-ink-600">
        {pointsWin} for a win, {pointsDraw} for a draw. Only played shows count.
      </p>
    </div>
  );
}
