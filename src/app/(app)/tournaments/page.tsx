import Link from "next/link";
import { db } from "@/lib/db";
import { getActiveWorld } from "@/lib/world";
import { TOURNAMENT_FORMAT_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "Tournaments — Wrestling Booker" };

export default async function TournamentsPage() {
  const world = await getActiveWorld();
  const tournaments = await db.tournament.findMany({
    where: { worldId: world.id },
    include: {
      company: { select: { name: true, abbreviation: true } },
      _count: { select: { entrants: true, segments: true } },
    },
    orderBy: [{ isComplete: "asc" }, { startsOn: "desc" }, { createdAt: "desc" }],
  });

  const played = await db.segment.groupBy({
    by: ["tournamentId"],
    where: { tournamentId: { in: tournaments.map((t) => t.id) }, show: { isFinalized: true } },
    _count: { _all: true },
  });
  const playedBy = new Map(played.map((row) => [row.tournamentId, row._count._all]));

  return (
    <div>
      <PageHeader
        title="Tournaments"
        subtitle={
          tournaments.length === 0
            ? undefined
            : `${tournaments.filter((t) => !t.isComplete).length} running · ${tournaments.filter((t) => t.isComplete).length} in the books`
        }
        action={<Link href="/tournaments/new" className="btn-primary">New</Link>}
      />

      {tournaments.length === 0 ? (
        <Empty>
          No tournaments yet.{" "}
          <Link href="/tournaments/new" className="text-plan-300 underline">Set one up.</Link>
        </Empty>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
          {tournaments.map((tournament) => (
            <li
              key={tournament.id}
              className="card-raised group border-l-2 p-3"
              style={{ borderLeftColor: tournament.color ?? "var(--color-ink-700)" }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <Link href={`/tournaments/${tournament.id}`} className="min-w-0">
                  <span className="name block truncate group-hover:text-played-300">
                    {tournament.name}
                  </span>
                </Link>
                {tournament.isComplete && <span className="chip-muted shrink-0">Concluded</span>}
              </div>
              <p className="display mt-1 text-[10px] tracking-widest text-ink-500">
                {TOURNAMENT_FORMAT_LABELS[tournament.format]}
                {tournament.company && ` · ${tournament.company.abbreviation ?? tournament.company.name}`}
              </p>
              <p className="mt-2 text-xs text-ink-500">
                {tournament._count.entrants} entrant{tournament._count.entrants === 1 ? "" : "s"} ·{" "}
                {playedBy.get(tournament.id) ?? 0} of {tournament._count.segments} matches played
                {tournament.startsOn ? ` · from ${formatDate(tournament.startsOn)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
