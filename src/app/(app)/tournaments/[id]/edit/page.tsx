import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getActiveWorld } from "@/lib/world";
import { deleteTournament, updateTournament } from "@/lib/actions/tournaments";
import { TournamentForm } from "@/components/tournament-form";
import { contendersIn } from "@/lib/tournament-field";
import { BackLink, PageHeader } from "@/components/ui";

export default async function EditTournamentPage({ params }: PageProps<"/tournaments/[id]/edit">) {
  const { id } = await params;
  const tournament = await db.tournament.findUnique({
    where: { id },
    include: { entrants: { orderBy: { order: "asc" } } },
  });
  if (!tournament) notFound();

  const world = await getActiveWorld();
  const [contenders, companies] = await Promise.all([
    contendersIn(world.id),
    db.company.findMany({
      where: { worldId: world.id },
      select: { id: true, name: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={`/tournaments/${id}`}>{tournament.name}</BackLink>
      <PageHeader title={`Edit ${tournament.name}`} />
      <TournamentForm
        action={updateTournament}
        submitLabel="Save tournament"
        contenders={contenders}
        companies={companies}
        tournament={{
          ...tournament,
          entrants: tournament.entrants.map((entrant) => {
            const ref = entrant.wrestlerId ? `w:${entrant.wrestlerId}` : `g:${entrant.groupId}`;
            return entrant.block ? `${ref}@${entrant.block}` : ref;
          }),
        }}
      />

      <form action={deleteTournament} className="mt-8">
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="btn-danger w-full">Delete tournament</button>
      </form>
      <p className="mt-2 text-center text-xs text-ink-600">
        The matches stay. They were ordinary matches that pointed here, and they
        go on counting towards records and reigns either way.
      </p>
    </div>
  );
}
