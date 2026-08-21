import Link from "next/link";
import { db } from "@/lib/db";
import { getActiveWorld } from "@/lib/world";
import { formatRecord, getUnitRecord } from "@/lib/derive";
import { unitKind } from "@/lib/constants";
import { Empty, PageHeader } from "@/components/ui";
import { PeekName } from "@/components/peek/peek-triggers";

export const metadata = { title: "Units — Wrestling Booker" };

export default async function GroupsPage() {
  const world = await getActiveWorld();
  const groups = await db.group.findMany({
    where: { worldId: world.id },
    include: { members: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
    orderBy: [{ isActive: "desc" }, { order: "asc" }, { name: "asc" }],
  });

  const records = await Promise.all(groups.map((g) => getUnitRecord(g.members.map((m) => m.id))));

  return (
    <div>
      <PageHeader
        title="Units"
        subtitle={`${groups.length} tag team${groups.length === 1 ? "" : "s"}, trio${groups.length === 1 ? "" : "s"} and faction${groups.length === 1 ? "" : "s"}`}
        action={
          <Link href="/groups/new" className="btn-primary">
            New
          </Link>
        }
      />

      {groups.length === 0 ? (
        <Empty>
          No units yet.{" "}
          <Link href="/groups/new" className="text-plan-300 underline">
            Make a tag team.
          </Link>
        </Empty>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2 2xl:grid-cols-3">
          {groups.map((group, index) => {
            const record = records[index];
            return (
              <li
                key={group.id}
                className="card-raised group border-l-2 p-3"
                style={{ borderLeftColor: group.color ?? "var(--color-ink-700)" }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/groups/${group.id}`} className="min-w-0">
                    <span className="name block truncate group-hover:text-played-300">
                      {group.name}
                    </span>
                  </Link>
                  <span className="stat shrink-0 text-ink-200">{formatRecord(record)}</span>
                </div>

                <p className="display mt-1 text-[10px] tracking-widest text-ink-500">
                  {unitKind(group.members.length)}
                  {!group.isActive && " · Disbanded"}
                </p>

                <p className="mt-2 flex flex-wrap gap-x-1.5 gap-y-1 text-sm text-ink-300">
                  {group.members.map((member, i) => (
                    <span key={member.id} className="whitespace-nowrap">
                      <PeekName id={member.id}>{member.name}</PeekName>
                      {i < group.members.length - 1 && <span className="text-ink-700"> ·</span>}
                    </span>
                  ))}
                  {group.members.length === 0 && <span className="text-ink-600">Nobody yet.</span>}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
