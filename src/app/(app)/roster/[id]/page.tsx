import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ALIGNMENT_LABELS, unitKind } from "@/lib/constants";
import { formatDate, todayISO } from "@/lib/dates";
import { formatRecord, getCurrentChampions, getMatchesFor, getTopOpponents, recordFrom } from "@/lib/derive";
import { getActiveWorld } from "@/lib/world";
import { BackLink, Empty, PageHeader } from "@/components/ui";
import { PeekHeadToHead, PeekShowButton, PeekTitleBelt } from "@/components/peek/peek-triggers";
import { createContract, endContract, deleteContract, setWrestlerStatus } from "@/lib/actions/roster";
import { PhotoUpload } from "@/components/photo-upload";

export default async function WrestlerPage({ params }: PageProps<"/roster/[id]">) {
  const { id } = await params;

  const wrestler = await db.wrestler.findUnique({
    where: { id },
    include: {
      photo: { select: { updatedAt: true } },
      contracts: {
        include: { company: { select: { id: true, name: true } } },
        orderBy: [{ endedOn: "asc" }, { isPrimary: "desc" }],
      },
      groups: {
        include: { members: { select: { id: true, name: true } } },
        orderBy: [{ isActive: "desc" }, { order: "asc" }, { name: "asc" }],
      },
    },
  });
  if (!wrestler) notFound();

  const world = await getActiveWorld();
  const [rows, opponents, champions, companies, upcoming] = await Promise.all([
    getMatchesFor(id),
    getTopOpponents(id, 6),
    getCurrentChampions(undefined, wrestler.worldId),
    db.company.findMany({ where: { worldId: world.id }, orderBy: { name: "asc" } }),
    db.segment.findMany({
      where: { show: { isFinalized: false }, participants: { some: { wrestlerId: id } } },
      include: { show: { select: { id: true, name: true, date: true } } },
      orderBy: { show: { date: "asc" } },
      take: 6,
    }),
  ]);

  const record = recordFrom(rows, id);
  const held = champions.filter((reign) => reign.holders.some((h) => h.id === id));
  const active = wrestler.contracts.filter((c) => !c.endedOn);
  const past = wrestler.contracts.filter((c) => c.endedOn);

  return (
    <div className="mx-auto max-w-6xl">
      <BackLink href="/roster">Roster</BackLink>
      <PageHeader
        title={wrestler.name}
        subtitle={[wrestler.nickname, ALIGNMENT_LABELS[wrestler.align], wrestler.height, wrestler.weight]
          .filter(Boolean)
          .join(" · ")}
        action={
          <Link href={`/roster/${id}/edit`} className="btn-ghost">
            Edit
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="card p-4">
            {world.photosEnabled && (
              <PhotoUpload wrestlerId={id} hasPhoto={Boolean(wrestler.photo)} name={wrestler.name} />
            )}
          </div>

          <div className="card p-4">
            <p className="section-title">Record</p>
            <p className="mt-1 font-mono text-3xl font-bold tabular-nums">{formatRecord(record)}</p>
            <p className="mt-1 text-xs text-ink-500">
              {record.matches} match{record.matches === 1 ? "" : "es"}
            </p>
          </div>

          {held.length > 0 && (
            <div className="card border-played-500/30 bg-played-500/5 p-4">
              <p className="section-title">Currently holding</p>
              <ul className="mt-2 space-y-1.5">
                {held.map((reign) => (
                  <li key={reign.id} className="text-sm">
                    <PeekTitleBelt id={reign.title.id} className="font-semibold text-played-300">
                      {reign.title.company.name} {reign.title.name}
                    </PeekTitleBelt>
                    <span className="block text-xs text-ink-500">
                      since {formatDate(reign.startedOn)} · {reign.days} days
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form action={setWrestlerStatus} className="card p-4">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="status" value={wrestler.status === "ACTIVE" ? "RETIRED" : "ACTIVE"} />
            <p className="section-title">Status</p>
            <p className="mt-1 mb-3 text-sm">{wrestler.status === "ACTIVE" ? "Active" : "Retired"}</p>
            <button type="submit" className="btn-ghost w-full">
              {wrestler.status === "ACTIVE" ? "Retire" : "Un-retire"}
            </button>
          </form>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <section className="card p-4">
            <p className="section-title mb-3">Contracts</p>
            {active.length === 0 && past.length === 0 && (
              <p className="text-sm text-ink-500">Free agent.</p>
            )}
            <ul className="space-y-2">
              {active.map((contract) => {
                const expired = contract.expiresOn && contract.expiresOn < new Date();
                return (
                  <li key={contract.id} className="rounded-lg border border-ink-700 bg-ink-900 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/companies/${contract.company.id}`} className="font-medium hover:text-plan-300">
                        {contract.company.name}
                      </Link>
                      {contract.isPrimary && <span className="chip-plan">Primary</span>}
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      {contract.signedOn ? `Signed ${formatDate(contract.signedOn)}` : "No signing date"}
                      {contract.expiresOn ? ` · Expires ${formatDate(contract.expiresOn)}` : ""}
                      {contract.salary ? ` · ${contract.salary}` : ""}
                    </p>
                    {expired && (
                      <p className="mt-1 text-xs text-played-300">
                        Expiry date has passed. Nothing has changed until you choose.
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <form action={endContract}>
                        <input type="hidden" name="id" value={contract.id} />
                        <input type="hidden" name="endedOn" value={todayISO()} />
                        <button type="submit" className="btn-ghost px-2 py-1 text-xs">
                          End (free agent)
                        </button>
                      </form>
                      <form action={deleteContract}>
                        <input type="hidden" name="id" value={contract.id} />
                        <button type="submit" className="btn-ghost px-2 py-1 text-xs text-ink-500">
                          Delete
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>

            {past.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-ink-500">
                  {past.length} past deal{past.length === 1 ? "" : "s"}
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-ink-500">
                  {past.map((contract) => (
                    <li key={contract.id}>
                      {contract.company.name} — ended {contract.endedOn ? formatDate(contract.endedOn) : ""}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {companies.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-plan-300">+ Add contract</summary>
                <form action={createContract} className="mt-3 space-y-3">
                  <input type="hidden" name="wrestlerId" value={id} />
                  <div>
                    <label className="label" htmlFor="companyId">Company</label>
                    <select id="companyId" name="companyId" required className="field">
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label" htmlFor="signedOn">Signed</label>
                      <input id="signedOn" type="date" name="signedOn" defaultValue={todayISO()} className="field" />
                    </div>
                    <div>
                      <label className="label" htmlFor="expiresOn">Expires</label>
                      <input id="expiresOn" type="date" name="expiresOn" className="field" />
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="salary">Salary</label>
                    <input id="salary" name="salary" placeholder="Flavour only" className="field" />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="isPrimary" defaultChecked={active.length === 0} className="size-4" />
                    Primary (home roster)
                  </label>
                  <button type="submit" className="btn-primary w-full">Add contract</button>
                </form>
              </details>
            )}
          </section>

          {upcoming.length > 0 && (
            <section className="card p-4">
              <p className="section-title mb-3">Booked ahead</p>
              <ul className="space-y-1.5 text-sm">
                {upcoming.map((segment) => (
                  <li key={segment.id} className="flex items-center justify-between gap-2">
                    <Link href={`/shows/${segment.show.id}`} className="truncate hover:text-plan-300">
                      {segment.show.name}
                    </Link>
                    <span className="shrink-0 text-xs text-ink-500">{formatDate(segment.show.date)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {opponents.length > 0 && (
            <section className="card p-4">
              <p className="section-title mb-3">Rivalries</p>
              <ul className="space-y-1.5">
                {opponents.map((opponent) => (
                  <li key={opponent.id}>
                    <PeekHeadToHead
                      a={id}
                      b={opponent.id}
                      className="flex w-full items-center justify-between rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-left text-sm hover:border-ink-600"
                    >
                      <span>{opponent.name}</span>
                      <span className="text-xs text-ink-500">
                        {opponent.matches} · {opponent.wins}-{opponent.losses}
                      </span>
                    </PeekHeadToHead>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {wrestler.groups.length > 0 && (
            <section className="card p-4">
              <p className="section-title mb-3">Units</p>
              <ul className="space-y-1.5">
                {wrestler.groups.map((group) => (
                  <li
                    key={group.id}
                    className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-2"
                    style={group.color ? { borderLeftColor: group.color, borderLeftWidth: 2 } : undefined}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={`/groups/${group.id}`} className="truncate text-sm hover:text-plan-300">
                        {group.name}
                      </Link>
                      <span className="display shrink-0 text-[10px] tracking-widest text-ink-500">
                        {unitKind(group.members.length)}
                        {!group.isActive && " · Disbanded"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {group.members
                        .filter((m) => m.id !== id)
                        .map((m) => m.name)
                        .join(" · ") || "Nobody else yet"}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-4">
            <p className="section-title mb-3">Match history</p>
            {rows.length === 0 ? (
              <Empty>No played matches yet.</Empty>
            ) : (
              <ul className="space-y-2">
                {rows.map((row) => {
                  const winners = row.participants.filter((p) => p.isWinner);
                  const won = winners.some((w) => w.id === id);
                  return (
                    <li key={row.segmentId} className="rounded-lg border border-ink-800 bg-ink-900 p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm">
                          {row.participants.map((p) => p.name).join(" vs ")}
                        </span>
                        <span
                          className={`shrink-0 text-xs font-semibold ${
                            winners.length === 0 ? "text-ink-400" : won ? "text-played-300" : "text-ink-400"
                          }`}
                        >
                          {winners.length === 0 ? "Draw" : won ? "Win" : "Loss"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-ink-500">
                        <PeekShowButton id={row.showId} className="underline decoration-dotted underline-offset-2">
                          {row.showName}
                        </PeekShowButton>{" "}
                        · {formatDate(row.date)}
                        {row.isTitleMatch ? ` · ${row.titleName ?? "Title match"}` : ""}
                        {row.stipulation ? ` · ${row.stipulation}` : ""}
                      </p>
                      {row.resultNote && <p className="mt-1 text-xs text-ink-400">{row.resultNote}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {wrestler.notes && (
            <section className="card p-4">
              <p className="section-title mb-2">Notes</p>
              <p className="text-sm whitespace-pre-wrap text-ink-200">{wrestler.notes}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
