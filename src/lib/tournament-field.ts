import { db } from "@/lib/db";
import { unitKind } from "@/lib/constants";
import type { Contender } from "@/components/tournament-form";

/**
 * Everyone who could enter: every active wrestler, and every active unit.
 * A unit enters as one competitor, which is how a tag league works.
 */
export async function contendersIn(worldId: string): Promise<Contender[]> {
  const [wrestlers, groups] = await Promise.all([
    db.wrestler.findMany({
      where: { worldId, status: "ACTIVE" },
      select: {
        name: true,
        id: true,
        contracts: {
          where: { endedOn: null },
          select: { company: { select: { abbreviation: true, name: true } } },
          orderBy: { isPrimary: "desc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    }),
    db.group.findMany({
      where: { worldId, isActive: true },
      select: { id: true, name: true, _count: { select: { members: true } } },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
  ]);

  return [
    ...groups.map((group) => ({
      ref: `g:${group.id}`,
      name: group.name,
      detail: unitKind(group._count.members),
      isUnit: true,
    })),
    ...wrestlers.map((wrestler) => ({
      ref: `w:${wrestler.id}`,
      name: wrestler.name,
      detail:
        wrestler.contracts[0]?.company.abbreviation ??
        wrestler.contracts[0]?.company.name ??
        "Free agent",
      isUnit: false,
    })),
  ];
}
