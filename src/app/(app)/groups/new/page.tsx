import { db } from "@/lib/db";
import { getActiveWorld } from "@/lib/world";
import { createGroup } from "@/lib/actions/groups";
import { GroupForm } from "@/components/group-form";
import { BackLink, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "New unit — Wrestling Booker" };

export default async function NewGroupPage() {
  const world = await getActiveWorld();
  const wrestlers = await db.wrestler.findMany({
    where: { worldId: world.id },
    include: { contracts: { where: { endedOn: null }, include: { company: { select: { name: true } } } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/groups">Units</BackLink>
      <PageHeader title="New unit" />
      {wrestlers.length === 0 ? (
        <Empty>Create a wrestler first — a unit is only its members.</Empty>
      ) : (
        <GroupForm
          action={createGroup}
          submitLabel="Create unit"
          wrestlers={wrestlers.map((w) => ({
            id: w.id,
            name: w.name,
            companies: w.contracts.map((c) => c.company.name),
            isRetired: w.status === "RETIRED",
            align: w.align,
          }))}
        />
      )}
    </div>
  );
}
