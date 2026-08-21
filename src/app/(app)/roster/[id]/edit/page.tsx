import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { WrestlerForm } from "@/components/wrestler-form";
import { deleteWrestler, updateWrestler } from "@/lib/actions/roster";
import { getActiveWorld } from "@/lib/world";
import { BackLink, PageHeader } from "@/components/ui";

export default async function EditWrestlerPage({ params }: PageProps<"/roster/[id]/edit">) {
  const { id } = await params;
  const wrestler = await db.wrestler.findUnique({
    where: { id },
    include: { photo: { select: { wrestlerId: true } } },
  });
  if (!wrestler) notFound();

  const world = await getActiveWorld();

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={`/roster/${id}`}>{wrestler.name}</BackLink>
      <PageHeader title={`Edit ${wrestler.name}`} />
      <WrestlerForm
        action={updateWrestler}
        wrestler={{ ...wrestler, hasPhoto: Boolean(wrestler.photo) }}
        submitLabel="Save changes"
        photosEnabled={world.photosEnabled}
      />

      <form action={deleteWrestler} className="mt-8">
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="btn-danger w-full">
          Delete wrestler
        </button>
      </form>
    </div>
  );
}
