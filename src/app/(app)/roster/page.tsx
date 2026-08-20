import Link from "next/link";
import { db } from "@/lib/db";
import { getRecords, formatRecord } from "@/lib/derive";
import { getActiveWorld } from "@/lib/world";
import { PageHeader, Empty } from "@/components/ui";
import { PeekName } from "@/components/peek/peek-triggers";
import { Avatar } from "@/components/avatar";
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
      photo: { select: { wrestlerId: true } },
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
          className="display text-[10px] tracking-widest text-ink-500 hover:text-ink-200"
        >
          {showRetired ? "Hide retired" : "Show retired"}
        </Link>
      </div>

      {wrestlers.length === 0 ? (
        <Empty>
          No wrestlers yet. <Link href="/roster/new" className="text-plan-300 underline">Create the first one.</Link>
        </Empty>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {wrestlers.map((wrestler) => {
            const record = records.get(wrestler.id);
            return (
              <li
                key={wrestler.id}
                className="card-raised group flex items-center gap-3 border-l-2 border-l-ink-700 p-2.5 transition-colors hover:border-l-played-500"
              >
                <Avatar
                  id={wrestler.id}
                  name={wrestler.name}
                  hasPhoto={Boolean(wrestler.photo)}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <Link href={`/roster/${wrestler.id}`} className="block">
                    <span className="name block truncate group-hover:text-played-300">
                      {wrestler.name}
                    </span>
                  </Link>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-ink-500">
                    <span
                      className={
                        wrestler.align === "FACE"
                          ? "text-plan-300"
                          : wrestler.align === "HEEL"
                            ? "text-danger-400"
                            : "text-ink-400"
                      }
                    >
                      {ALIGNMENT_LABELS[wrestler.align]}
                    </span>
                    <span className="text-ink-700">|</span>
                    <span className="truncate">
                      {wrestler.contracts.map((c) => c.company.abbreviation ?? c.company.name).join(" · ") ||
                        "Free agent"}
                    </span>
                    {wrestler.status === "RETIRED" && <span className="chip-muted">Ret</span>}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="stat block text-ink-200">{record ? formatRecord(record) : "0-0"}</span>
                  <PeekName id={wrestler.id} className="display mt-0.5 block text-[10px] tracking-widest text-ink-600">
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
