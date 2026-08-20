import { SegmentType } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

/**
 * The only code in the app that writes a reign. Title histories are derived
 * from results: playing a title match closes the old reign and opens a new
 * one, with the dates and events filled in from the show itself.
 *
 * Kept apart from the server action so it can be exercised directly.
 */
type Tx = Prisma.TransactionClient;

function sameHolders(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

export async function applyTitleChanges(tx: Tx, showId: string) {
  const show = await tx.show.findUniqueOrThrow({
    where: { id: showId },
    include: {
      segments: {
        orderBy: { order: "asc" },
        include: { participants: { orderBy: { order: "asc" } } },
      },
    },
  });

  // Card order matters: a belt can change hands twice on one night.
  for (const segment of show.segments) {
    if (segment.type !== SegmentType.MATCH) continue;
    if (!segment.isTitleMatch || !segment.titleId) continue;

    const winners = segment.participants.filter((p) => p.isWinner).map((p) => p.wrestlerId);
    // No winner means no decision — the champion walks out still champion.
    if (winners.length === 0) continue;

    const current = await tx.reign.findFirst({
      where: { titleId: segment.titleId, endedOn: null },
      orderBy: { startedOn: "desc" },
      include: { holders: { select: { id: true } } },
    });

    // A successful defence changes nothing: the reign simply continues.
    if (current && sameHolders(current.holders.map((h) => h.id), winners)) continue;

    if (current) {
      await tx.reign.update({
        where: { id: current.id },
        data: { endedOn: show.date, lostAtShowId: show.id, lostAtSegmentId: segment.id },
      });
    }

    await tx.reign.create({
      data: {
        titleId: segment.titleId,
        startedOn: show.date,
        wonAtShowId: show.id,
        wonAtSegmentId: segment.id,
        holders: { connect: winners.map((id) => ({ id })) },
      },
    });
  }
}
