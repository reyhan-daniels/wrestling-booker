import Link from "next/link";
import { db } from "@/lib/db";
import { getRecords, formatRecord } from "@/lib/derive";
import { getActiveWorld } from "@/lib/world";
import { PageHeader, Empty } from "@/components/ui";
import { RosterFilters } from "@/components/roster-filters";
import { PeekName } from "@/components/peek/peek-triggers";
import { Avatar } from "@/components/avatar";
import { ALIGNMENT_LABELS } from "@/lib/constants";
import { Alignment, Gender } from "@/generated/prisma/enums";

export const metadata = { title: "Roster — Wrestling Booker" };

export default async function RosterPage({ searchParams }: PageProps<"/roster">) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? params[key] : "");

  const query = one("q");
  const company = one("company");
  const align = one("align");
  const gender = one("gender");
  const unit = one("unit");
  const status = one("status");

  const world = await getActiveWorld();

  // Only values the schema knows about become filters; anything else in the
  // URL is ignored rather than thrown at the database.
  const where = {
    worldId: world.id,
    ...(status === "all" ? {} : { status: status === "RETIRED" ? "RETIRED" : "ACTIVE" } as const),
    ...(query ? { name: { contains: query, mode: "insensitive" as const } } : {}),
    ...(align in Alignment ? { align: align as Alignment } : {}),
    ...(gender === "unset"
      ? { gender: null }
      : gender in Gender
        ? { gender: gender as Gender }
        : {}),
    ...(company === "none"
      ? { contracts: { none: { endedOn: null } } }
      : company
        ? { contracts: { some: { companyId: company, endedOn: null } } }
        : {}),
    ...(unit === "none" ? { groups: { none: {} } } : unit ? { groups: { some: { id: unit } } } : {}),
  };

  const [wrestlers, total, companies, units] = await Promise.all([
    db.wrestler.findMany({
      where,
      include: {
        photo: { select: { wrestlerId: true } },
        contracts: {
          where: { endedOn: null },
          include: { company: { select: { id: true, name: true, abbreviation: true } } },
          orderBy: { isPrimary: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.wrestler.count({ where: { worldId: world.id, status: "ACTIVE" } }),
    db.company.findMany({
      where: { worldId: world.id },
      select: { id: true, name: true, abbreviation: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    db.group.findMany({
      where: { worldId: world.id, isActive: true },
      select: { id: true, name: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
  ]);

  const records = await getRecords(wrestlers.map((w) => w.id));

  return (
    <div>
      <PageHeader
        title="Roster"
        subtitle={`${total} wrestler${total === 1 ? "" : "s"}`}
        action={
          <Link href="/roster/new" className="btn-primary">
            New
          </Link>
        }
      />

      <RosterFilters
        values={{ q: query, company, align, gender, unit, status }}
        companies={companies}
        units={units}
        showing={wrestlers.length}
        total={total}
      />

      {wrestlers.length === 0 ? (
        <Empty>
          {total === 0 ? (
            <>
              No wrestlers yet.{" "}
              <Link href="/roster/new" className="text-plan-300 underline">Create the first one.</Link>
            </>
          ) : (
            <>Nobody matches that. <Link href="/roster" className="text-plan-300 underline">Clear the filters.</Link></>
          )}
        </Empty>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
