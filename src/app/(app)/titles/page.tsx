import Link from "next/link";
import { db } from "@/lib/db";
import { formatDuration } from "@/lib/dates";
import { getCurrentChampions } from "@/lib/derive";
import { getActiveWorld } from "@/lib/world";
import { Empty, PageHeader } from "@/components/ui";
import { PeekName } from "@/components/peek/peek-triggers";

export const metadata = { title: "Titles — Wrestling Booker" };

export default async function TitlesPage() {
  const world = await getActiveWorld();
  const [titles, champions] = await Promise.all([
    db.title.findMany({
      where: { company: { worldId: world.id } },
      include: { company: { select: { id: true, name: true } }, _count: { select: { reigns: true } } },
      orderBy: [{ company: { name: "asc" } }, { isActive: "desc" }, { name: "asc" }],
    }),
    getCurrentChampions(undefined, world.id),
  ]);

  return (
    <div>
      <PageHeader title="Titles" />

      {titles.length === 0 ? (
        <Empty>No titles yet. Add one from a company page.</Empty>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {titles.map((title) => {
            const reign = champions.find((c) => c.title.id === title.id);
            return (
              <li key={title.id} className="card-raised border-l-2 border-l-played-500 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/titles/${title.id}`} className="block">
                      <span className="name block text-played-300">{title.name}</span>
                    </Link>
                    <p className="display mt-0.5 text-[10px] tracking-widest text-ink-500">
                      {title.company.name}
                    </p>
                  </div>
                  {!title.isActive && <span className="chip-muted">Retired</span>}
                </div>
                <div className="mt-3 rounded-[2px] border border-played-500/25 bg-played-500/[0.07] p-3">
                  {reign ? (
                    <>
                      <p className="name text-played-200">
                        {reign.holders.map((holder, index) => (
                          <span key={holder.id}>
                            {index > 0 && " & "}
                            <PeekName id={holder.id}>{holder.name}</PeekName>
                          </span>
                        ))}
                      </p>
                      <p className="stat mt-1 text-xs text-ink-400">{formatDuration(reign.days)}</p>
                    </>
                  ) : (
                    <p className="text-sm text-ink-500">Vacant — no reign yet</p>
                  )}
                </div>
                <p className="display mt-2 text-[10px] tracking-widest text-ink-600">
                  {title._count.reigns} reign{title._count.reigns === 1 ? "" : "s"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
