import Link from "next/link";
import { db } from "@/lib/db";
import { getRecords, formatRecord } from "@/lib/derive";
import { getActiveWorld } from "@/lib/world";
import { PageHeader, Empty } from "@/components/ui";
import { PeekName } from "@/components/peek/peek-triggers";
import { ALIGNMENT_LABELS } from "@/lib/constants";

export const metadata = { title: "Roster — Wrestling Booker" };

export default async function RosterPage({ searchParams }: PageProps<"/roster">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const showRetired = params.retired === "1";

  const world = await getActiveWorld();
  const wrestlers = await db.wrestler.findMany({
    where: {
      worldId: world.id,
      ...(showRetired ? {} : { status: "ACTIVE" }),
      ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}),
    },
    include: {
      contracts: {
        where: { endedOn: null },
        include: { company: { select: { id: true, name: true, abbreviation: true } } },
        orderBy: { isPrimary: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const records = await getRecords(wrestlers.map((w) => w.id));

  return (
    <div>
      <PageHeader
        title="Roster"
        subtitle={`${wrestlers.length} wrestler${wrestlers.length === 1 ? "" : "s"}`}
        action={
          <Link href="/roster/new" className="btn-primary">
            New
          </Link>
        }
      />

      <form className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search names"
          className="field"
          type="search"
        />
        {showRetired && <input type="hidden" name="retired" value="1" />}
        <button type="submit" className="btn-ghost">Search</button>
      </form>

      <div className="mb-4">
        <Link
          href={showRetired ? "/roster" : "/roster?retired=1"}
          className="text-xs text-ink-400 hover:text-ink-100"
        >
          {showRetired ? "Hide retired" : "Show retired"}
        </Link>
      </div>

      {wrestlers.length === 0 ? (
        <Empty>
          No wrestlers yet. <Link href="/roster/new" className="text-plan-300 underline">Create the first one.</Link>
        </Empty>
      ) : (
        <ul className="space-y-2">
          {wrestlers.map((wrestler) => {
            const record = records.get(wrestler.id);
            return (
              <li key={wrestler.id} className="card flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/roster/${wrestler.id}`} className="truncate font-medium hover:text-plan-300">
                      {wrestler.name}
                    </Link>
                    {wrestler.status === "RETIRED" && <span className="chip-muted">Retired</span>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-500">
                    {[
                      ALIGNMENT_LABELS[wrestler.align],
                      ...wrestler.contracts.map(
                        (c) => c.company.abbreviation ?? c.company.name,
                      ),
                    ].join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-mono text-sm tabular-nums text-ink-200">
                    {record ? formatRecord(record) : "0-0"}
                  </span>
                  <PeekName id={wrestler.id} className="mt-0.5 block text-[11px] text-ink-500">
                    peek
                  </PeekName>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
