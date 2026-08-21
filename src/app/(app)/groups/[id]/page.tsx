import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { formatRecord, getUnitMatches, unitRecordFrom } from "@/lib/derive";
import { unitKind } from "@/lib/constants";
import { getActiveWorld } from "@/lib/world";
import { BackLink, Empty, PageHeader } from "@/components/ui";
import { PeekName, PeekShowButton } from "@/components/peek/peek-triggers";
import { Avatar } from "@/components/avatar";

export default async function GroupPage({ params }: PageProps<"/groups/[id]">) {
  const { id } = await params;

  const group = await db.group.findUnique({
    where: { id },
    include: {
      members: {
        include: { photo: { select: { wrestlerId: true } } },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!group) notFound();

  const world = await getActiveWorld();
  const memberIds = group.members.map((m) => m.id);
  const rows = await getUnitMatches(memberIds);
  const record = unitRecordFrom(rows, memberIds);

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/groups">Units</BackLink>
      <PageHeader
        title={group.name}
        subtitle={`${unitKind(group.members.length)}${group.isActive ? "" : " · Disbanded"}`}
        action={
          <Link href={`/groups/${id}/edit`} className="btn-ghost">
            Edit
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <p className="section-title mb-3">Members</p>
          {group.members.length === 0 ? (
            <Empty>
              Nobody in this unit.{" "}
              <Link href={`/groups/${id}/edit`} className="text-plan-300 underline">Add someone.</Link>
            </Empty>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {group.members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 rounded-lg border border-ink-800 bg-ink-900 px-3 py-2"
                >
                  <Avatar
                    id={member.id}
                    name={member.name}
                    hasPhoto={world.photosEnabled && Boolean(member.photo)}
                    size={32}
                  />
                  <Link href={`/roster/${member.id}`} className="min-w-0 flex-1 truncate text-sm hover:text-plan-300">
                    {member.name}
                  </Link>
                  <PeekName id={member.id} className="display shrink-0 text-[10px] tracking-widest text-ink-600">
                    peek
                  </PeekName>
                </li>
              ))}
            </ul>
          )}
          {group.notes && <p className="mt-4 text-sm text-ink-400">{group.notes}</p>}
        </section>

        <section className="card p-4">
          <p className="section-title mb-3">Record</p>
          <p className="stat text-3xl text-ink-100">{formatRecord(record)}</p>
          <p className="mt-1 text-xs text-ink-500">
            {record.matches} match{record.matches === 1 ? "" : "es"} with all{" "}
            {group.members.length} on the same side.
          </p>
          <p className="mt-3 text-xs text-ink-600">
            Matches where the unit split up count for neither side — that is the
            unit imploding, not the unit working.
          </p>
        </section>

        <section className="card p-4 lg:col-span-3">
          <p className="section-title mb-3">Matches as a unit</p>
          {rows.length === 0 ? (
            <Empty>
              {group.members.length < 2
                ? "A unit needs at least two members before it can have a record."
                : "No played matches with everyone on the same side yet."}
            </Empty>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => {
                const winners = row.participants.filter((p) => p.isWinner);
                const won = winners.some((w) => memberIds.includes(w.id));
                return (
                  <li key={row.segmentId} className="rounded-lg border border-ink-800 bg-ink-900 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm">{row.participants.map((p) => p.name).join(" vs ")}</span>
                      <span
                        className={`shrink-0 text-xs font-semibold ${
                          winners.length === 0 ? "text-ink-400" : won ? "text-played-300" : "text-ink-400"
                        }`}
                      >
                        {winners.length === 0 ? "Draw" : won ? "Win" : "Loss"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-ink-500">
                      <PeekShowButton id={row.showId} className="underline decoration-dotted underline-offset-2">
                        {row.showName}
                      </PeekShowButton>{" "}
                      · {formatDate(row.date)}
                      {row.isTitleMatch ? ` · ${row.titleName ?? "Title match"}` : ""}
                      {row.stipulation ? ` · ${row.stipulation}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
