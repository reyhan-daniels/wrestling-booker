import { db } from "@/lib/db";
import { unitKind } from "@/lib/constants";
import type { Contender } from "@/components/tournament-form";

/**
 * Everyone who could enter: every active wrestler, and every active unit.
 * A unit enters as one competitor, which is how a tag league works.
 *
 * Each one carries the promotions it is under contract to, so the field can be
 * narrowed to one roster while it is being picked. A unit counts as being in a
 * promotion if *any* member is: a team can be mixed, and hiding it from both
 * sides would be worse than offering it to both.
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
          select: { company: { select: { id: true, abbreviation: true, name: true } } },
          orderBy: { isPrimary: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    db.group.findMany({
      where: { worldId, isActive: true },
      select: {
        id: true,
        name: true,
        members: {
          select: { contracts: { where: { endedOn: null }, select: { companyId: true } } },
        },
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
  ]);

  return [
    ...groups.map((group) => ({
      ref: `g:${group.id}`,
      name: group.name,
      detail: unitKind(group.members.length),
      isUnit: true,
      companyIds: [
        ...new Set(group.members.flatMap((member) => member.contracts.map((c) => c.companyId))),
      ],
    })),
    ...wrestlers.map((wrestler) => ({
      ref: `w:${wrestler.id}`,
      name: wrestler.name,
      detail:
        wrestler.contracts[0]?.company.abbreviation ??
        wrestler.contracts[0]?.company.name ??
        "Free agent",
      isUnit: false,
      companyIds: wrestler.contracts.map((contract) => contract.company.id),
    })),
  ];
}
