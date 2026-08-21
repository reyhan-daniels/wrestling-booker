import { WrestlerForm } from "@/components/wrestler-form";
import { createWrestler } from "@/lib/actions/roster";
import { BackLink, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { getActiveWorld } from "@/lib/world";

export const metadata = { title: "New wrestler — Wrestling Booker" };

export default async function NewWrestlerPage({ searchParams }: PageProps<"/roster/new">) {
  const params = await searchParams;
  const preselected = typeof params.company === "string" ? params.company : undefined;

  const world = await getActiveWorld();
  const companies = await db.company.findMany({
    where: { worldId: world.id },
    select: { id: true, name: true, abbreviation: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  const from = companies.find((company) => company.id === preselected);

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={from ? `/companies/${from.id}` : "/roster"}>
        {from ? from.name : "Roster"}
      </BackLink>
      <PageHeader title="New wrestler" subtitle={from ? `Signing to ${from.name}` : undefined} />
      <WrestlerForm
        action={createWrestler}
        submitLabel="Create wrestler"
        companies={companies}
        preselectedCompanyId={from?.id}
        photosEnabled={world.photosEnabled}
      />
    </div>
  );
}
