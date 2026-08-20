import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { segmentTypeLabel } from "@/lib/constants";
import { formatDateLong, toISODate } from "@/lib/dates";
import { getActiveWorld } from "@/lib/world";
import { deleteShow, duplicateShow, updateShow } from "@/lib/actions/shows";
import { BackLink, PageHeader, StateChip } from "@/components/ui";
import { CardView, type CardSegment } from "@/components/card-view";

export default async function ShowPage({ params }: PageProps<"/shows/[id]">) {
  const { id } = await params;

  const show = await db.show.findUnique({
    where: { id },
    include: {
      companies: { select: { id: true, name: true } },
      series: { select: { id: true, name: true } },
      segments: {
        orderBy: { order: "asc" },
        include: {
          title: { select: { id: true, name: true } },
          participants: {
            orderBy: { order: "asc" },
            include: { wrestler: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!show) notFound();

  const world = await getActiveWorld();
  const companyIds = show.companies.map((c) => c.id);

  const [roster, titles, allCompanies] = await Promise.all([
    db.wrestler.findMany({
      where: { worldId: world.id },
      include: {
        contracts: {
          where: { endedOn: null },
          include: { company: { select: { id: true, name: true, abbreviation: true } } },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.title.findMany({
      where: { isActive: true, company: { worldId: world.id } },
      include: { company: { select: { id: true, name: true } } },
      orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
    }),
    db.company.findMany({ where: { worldId: world.id }, orderBy: { name: "asc" } }),
  ]);

  // Contracts govern display, not eligibility: the home roster sorts to the
  // top, but anybody in the world can be booked as a guest.
  const wrestlers = roster
    .map((wrestler) => ({
      id: wrestler.id,
      name: wrestler.name,
      companies: wrestler.contracts.map((c) => c.company.abbreviation ?? c.company.name),
      isRetired: wrestler.status === "RETIRED",
      onCard: wrestler.contracts.some((c) => companyIds.includes(c.companyId)),
    }))
    .sort((a, b) => Number(b.onCard) - Number(a.onCard) || a.name.localeCompare(b.name));

  const pickableTitles = titles
    .map((title) => ({
      id: title.id,
      name: title.name,
      companyName: title.company.name,
      onCard: companyIds.includes(title.companyId),
    }))
    .sort((a, b) => Number(b.onCard) - Number(a.onCard) || a.companyName.localeCompare(b.companyName));

  const segments: CardSegment[] = show.segments.map((segment) => ({
    id: segment.id,
    order: segment.order,
    type: segment.type,
    customType: segment.customType,
    typeLabel: segmentTypeLabel(segment.type, segment.customType),
    note: segment.note,
    isTitleMatch: segment.isTitleMatch,
    titleId: segment.titleId,
    titleName: segment.title?.name ?? null,
    stipulation: segment.stipulation,
    resultNote: segment.resultNote,
    participantIds: segment.participants.map((p) => p.wrestlerId),
    participants: segment.participants.map((p) => ({
      id: p.wrestler.id,
      name: p.wrestler.name,
      isWinner: p.isWinner,
    })),
  }));

  const matchCount = show.segments.filter((s) => s.type === "MATCH").length;

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/calendar">Calendar</BackLink>

      <PageHeader
        title={show.name}
        subtitle={`${formatDateLong(show.date)} · ${show.companies.map((c) => c.name).join(" × ")}${
          show.venue ? ` · ${show.venue}` : ""
        }`}
        action={<StateChip isFinalized={show.isFinalized} />}
      />

      {show.isFinalized ? (
        <div className="card mb-4 border-played-500/30 bg-played-500/5 p-4">
          <p className="text-sm font-semibold text-played-300">This show has been played.</p>
          <p className="mt-1 text-xs text-ink-400">
            The past is permanent — the card and its results can no longer be changed. Everything
            derived from it moves forward only.
          </p>
        </div>
      ) : (
        <div className="mb-4 flex gap-2">
          <Link href={`/shows/${id}/play`} className="btn-gold flex-1">
            Play this show →
          </Link>
        </div>
      )}

      <CardView
        showId={id}
        isFinalized={show.isFinalized}
        segments={segments}
        wrestlers={wrestlers}
        titles={pickableTitles}
      />

      {show.notes && (
        <section className="card mt-4 p-4">
          <p className="section-title mb-2">Show notes</p>
          <p className="text-sm whitespace-pre-wrap text-ink-200">{show.notes}</p>
        </section>
      )}

      <section className="card mt-4 p-4">
        <details>
          <summary className="section-title cursor-pointer">
            {show.isFinalized ? "Show details" : "Show details & danger zone"}
          </summary>

          {show.isFinalized ? (
            <p className="mt-3 text-sm text-ink-500">
              {matchCount} match{matchCount === 1 ? "" : "es"} on a played card. Nothing here is editable.
            </p>
          ) : (
            <>
              <form action={updateShow} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={id} />
                <div>
                  <label className="label" htmlFor="name">Name</label>
                  <input id="name" name="name" required defaultValue={show.name} className="field" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="date">Date</label>
                    <input id="date" type="date" name="date" required defaultValue={toISODate(show.date)} className="field" />
                  </div>
                  <div>
                    <label className="label" htmlFor="venue">Venue</label>
                    <input id="venue" name="venue" defaultValue={show.venue ?? ""} className="field" />
                  </div>
                </div>
                <div>
                  <span className="label">Companies</span>
                  <ul className="space-y-1.5">
                    {allCompanies.map((company) => (
                      <li key={company.id}>
                        <label className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            name="companyIds"
                            value={company.id}
                            defaultChecked={companyIds.includes(company.id)}
                            className="size-4"
                          />
                          {company.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <label className="label" htmlFor="notes">Notes</label>
                  <textarea id="notes" name="notes" rows={2} defaultValue={show.notes ?? ""} className="field" />
                </div>
                <button type="submit" className="btn-primary">Save details</button>
              </form>

              <form action={duplicateShow} className="mt-6 space-y-3 border-t border-ink-800 pt-4">
                <input type="hidden" name="id" value={id} />
                <p className="section-title">Copy this card</p>
                <div className="grid grid-cols-2 gap-3">
                  <input name="name" required defaultValue={`${show.name} (copy)`} className="field" />
                  <input type="date" name="date" defaultValue={toISODate(show.date)} className="field" />
                </div>
                <p className="text-xs text-ink-500">
                  Participants and stipulations come across; results never do.
                </p>
                <button type="submit" className="btn-ghost">Duplicate show</button>
              </form>

              <form action={deleteShow} className="mt-6 border-t border-ink-800 pt-4">
                <input type="hidden" name="id" value={id} />
                <button type="submit" className="btn-danger">Delete show</button>
              </form>
            </>
          )}
        </details>
      </section>
    </div>
  );
}
