import { db } from "@/lib/db";
import { getActiveWorld } from "@/lib/world";
import { createTournament } from "@/lib/actions/tournaments";
import { TournamentForm } from "@/components/tournament-form";
import { contendersIn } from "@/lib/tournament-field";
import { BackLink, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "New tournament — Wrestling Booker" };

export default async function NewTournamentPage() {
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
      <BackLink href="/tournaments">Tournaments</BackLink>
      <PageHeader title="New tournament" />
      {contenders.length === 0 ? (
        <Empty>Create a wrestler first — a tournament is only its field.</Empty>
      ) : (
        <TournamentForm
          action={createTournament}
          submitLabel="Create tournament"
          contenders={contenders}
          companies={companies}
        />
      )}
    </div>
  );
}
