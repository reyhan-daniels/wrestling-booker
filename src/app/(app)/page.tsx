import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate, formatDuration, parseISODate, todayISO } from "@/lib/dates";
import { getCurrentChampions, getExpiredContracts } from "@/lib/derive";
import { getActiveWorld } from "@/lib/world";
import { endContract, resignContract, setWrestlerStatus } from "@/lib/actions/roster";
import { Empty, PageHeader, StateChip } from "@/components/ui";
import { PeekName, PeekTitleBelt } from "@/components/peek/peek-triggers";

export default async function HomePage() {
  const world = await getActiveWorld();
  const today = parseISODate(todayISO());

  const [due, upcoming, played, champions, expired, counts] = await Promise.all([
    // Booked, dated today or earlier, still waiting to be played.
    db.show.findMany({
      where: { worldId: world.id, isFinalized: false, date: { lte: today } },
      include: { companies: { select: { name: true } }, _count: { select: { segments: true } } },
      orderBy: { date: "asc" },
      take: 5,
    }),
    db.show.findMany({
      where: { worldId: world.id, isFinalized: false, date: { gt: today } },
      include: { companies: { select: { name: true } }, _count: { select: { segments: true } } },
      orderBy: { date: "asc" },
      take: 6,
    }),
    db.show.findMany({
      where: { worldId: world.id, isFinalized: true },
      include: { companies: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 5,
    }),
    getCurrentChampions(),
    getExpiredContracts(world.id, today),
    Promise.all([
      db.wrestler.count({ where: { worldId: world.id } }),
      db.company.count({ where: { worldId: world.id } }),
      db.show.count({ where: { worldId: world.id, isFinalized: true } }),
    ]),
  ]);

  const [wrestlerCount, companyCount, playedCount] = counts;

  return (
    <div>
      <PageHeader
        title={world.name}
        subtitle={`${wrestlerCount} wrestlers · ${companyCount} companies · ${playedCount} shows played`}
        action={<Link href="/shows/new" className="btn-primary">New show</Link>}
      />

      {expired.length > 0 && (
        <section className="card mb-4 border-played-500/30 bg-played-500/5 p-4">
          <p className="section-title text-played-300">Needs your attention</p>
          <ul className="space-y-2">
            {expired.map((contract) => (
              <li key={contract.id} className="rounded-lg border border-ink-700 bg-ink-900 p-3">
                <p className="text-sm">
                  <PeekName id={contract.wrestler.id} className="font-medium">
                    {contract.wrestler.name}
                  </PeekName>{" "}
                  <span className="text-ink-500">· {contract.company.name}</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  Expired {contract.expiresOn ? formatDate(contract.expiresOn) : ""}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <form action={resignContract}>
                    <input type="hidden" name="id" value={contract.id} />
                    <input type="hidden" name="years" value="1" />
                    <button type="submit" className="btn-ghost px-2.5 py-1 text-xs">Re-sign +1 year</button>
                  </form>
                  <Link href={`/roster/${contract.wrestler.id}`} className="btn-ghost px-2.5 py-1 text-xs">
                    Move / edit
                  </Link>
                  <form action={endContract}>
                    <input type="hidden" name="id" value={contract.id} />
                    <input type="hidden" name="endedOn" value={todayISO()} />
                    <button type="submit" className="btn-ghost px-2.5 py-1 text-xs">Free agent</button>
                  </form>
                  <form action={setWrestlerStatus}>
                    <input type="hidden" name="id" value={contract.wrestler.id} />
                    <input type="hidden" name="status" value="RETIRED" />
                    <button type="submit" className="btn-ghost px-2.5 py-1 text-xs">Retire</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <p className="section-title mb-3">Ready to play</p>
          {due.length === 0 ? (
            <p className="text-sm text-ink-500">Nothing waiting.</p>
          ) : (
            <ul className="space-y-2">
              {due.map((show) => (
                <li key={show.id} className="rounded-lg border border-ink-700 bg-ink-900 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/shows/${show.id}`} className="truncate font-medium hover:text-plan-300">
                      {show.name}
                    </Link>
                    <span className="shrink-0 text-xs text-ink-500">{formatDate(show.date)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-500">
                    {show.companies.map((c) => c.name).join(" × ")} · {show._count.segments} segment
                    {show._count.segments === 1 ? "" : "s"}
                  </p>
                  <Link href={`/shows/${show.id}/play`} className="btn-gold mt-2 w-full py-1.5 text-xs">
                    Play →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <p className="section-title mb-3">Booked ahead</p>
          {upcoming.length === 0 ? (
            <Empty>
              Nothing booked. <Link href="/calendar" className="text-plan-300 underline">Open the calendar.</Link>
            </Empty>
          ) : (
            <ul className="space-y-1.5">
              {upcoming.map((show) => (
                <li key={show.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-800 bg-ink-900 px-3 py-2">
                  <Link href={`/shows/${show.id}`} className="truncate text-sm hover:text-plan-300">
                    {show.name}
                  </Link>
                  <span className="shrink-0 text-xs text-ink-500">{formatDate(show.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <p className="section-title mb-3">Champions</p>
          {champions.length === 0 ? (
            <p className="text-sm text-ink-500">No champions yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {champions.map((reign) => (
                <li key={reign.id} className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-2">
                  <PeekTitleBelt id={reign.title.id} className="text-xs text-ink-500">
                    {reign.title.company.name} {reign.title.name}
                  </PeekTitleBelt>
                  <p className="mt-0.5 text-sm font-semibold text-played-300">
                    {reign.holders.map((holder, index) => (
                      <span key={holder.id}>
                        {index > 0 && " & "}
                        <PeekName id={holder.id}>{holder.name}</PeekName>
                      </span>
                    ))}
                    <span className="ml-2 text-xs font-normal text-ink-500">
                      {formatDuration(reign.days)}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <p className="section-title mb-3">Recently played</p>
          {played.length === 0 ? (
            <p className="text-sm text-ink-500">No history yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {played.map((show) => (
                <li key={show.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-800 bg-ink-900 px-3 py-2">
                  <Link href={`/shows/${show.id}`} className="truncate text-sm hover:text-played-300">
                    {show.name}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-ink-500">{formatDate(show.date)}</span>
                    <StateChip isFinalized />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
