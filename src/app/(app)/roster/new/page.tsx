import { WrestlerForm } from "@/components/wrestler-form";
import { createWrestler } from "@/lib/actions/roster";
import { BackLink, PageHeader } from "@/components/ui";

export const metadata = { title: "New wrestler — Wrestling Booker" };

export default function NewWrestlerPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/roster">Roster</BackLink>
      <PageHeader title="New wrestler" />
      <WrestlerForm action={createWrestler} submitLabel="Create wrestler" />
    </div>
  );
}
