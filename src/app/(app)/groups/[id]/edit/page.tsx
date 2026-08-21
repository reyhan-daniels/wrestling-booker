import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getActiveWorld } from "@/lib/world";
import { deleteGroup, updateGroup } from "@/lib/actions/groups";
import { GroupForm } from "@/components/group-form";
import { BackLink, PageHeader } from "@/components/ui";

export default async function EditGroupPage({ params }: PageProps<"/groups/[id]/edit">) {
  const { id } = await params;
  const group = await db.group.findUnique({
    where: { id },
    include: { members: { select: { id: true } } },
  });
  if (!group) notFound();

  const world = await getActiveWorld();
  const wrestlers = await db.wrestler.findMany({
    where: { worldId: world.id },
    include: { contracts: { where: { endedOn: null }, include: { company: { select: { name: true } } } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={`/groups/${id}`}>{group.name}</BackLink>
      <PageHeader title={`Edit ${group.name}`} />
      <GroupForm
        action={updateGroup}
        submitLabel="Save unit"
        group={{ ...group, memberIds: group.members.map((m) => m.id) }}
        wrestlers={wrestlers.map((w) => ({
          id: w.id,
          name: w.name,
          companies: w.contracts.map((c) => c.company.name),
          isRetired: w.status === "RETIRED",
          align: w.align,
        }))}
      />

      <form action={deleteGroup} className="mt-8">
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="btn-danger w-full">
          Delete unit
        </button>
      </form>
      <p className="mt-2 text-center text-xs text-ink-600">
        Deleting a unit loses only the grouping. Its members and their matches
        are untouched — the record here was only ever derived from theirs.
      </p>
    </div>
  );
}
