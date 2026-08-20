"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { applyTitleChanges } from "@/lib/titles";
import { list, requiredText, text } from "@/lib/form";

/**
 * Play = choosing winners. This is the act that finalizes a show and makes it
 * count. Everything downstream — records, reigns, head-to-heads — is derived
 * from what happens here.
 */

async function assertUnplayed(showId: string) {
  const show = await db.show.findUniqueOrThrow({
    where: { id: showId },
    select: { id: true, isFinalized: true },
  });
  if (show.isFinalized) {
    throw new Error("This show has already been played. Played shows are permanent.");
  }
  return show;
}

/**
 * Save one segment's outcome while working through the card. Nothing counts
 * yet: derived views read finalized shows only, so this stays reversible right
 * up until the show is finalized.
 */
export async function saveResult(data: FormData) {
  const segmentId = requiredText(data, "segmentId", "Segment");
  const segment = await db.segment.findUniqueOrThrow({
    where: { id: segmentId },
    select: { showId: true },
  });
  await assertUnplayed(segment.showId);

  const winnerIds = list(data, "winnerIds");

  await db.$transaction(async (tx) => {
    await tx.segment.update({
      where: { id: segmentId },
      data: { resultNote: text(data, "resultNote") },
    });
    await tx.segmentParticipant.updateMany({ where: { segmentId }, data: { isWinner: false } });
    if (winnerIds.length) {
      await tx.segmentParticipant.updateMany({
        where: { segmentId, wrestlerId: { in: winnerIds } },
        data: { isWinner: true },
      });
    }
  });

  revalidatePath(`/shows/${segment.showId}/play`);
}

/**
 * The one-way door. Closes the show, then lets every title match on the card
 * move its lineage.
 */
export async function finalizeShow(data: FormData) {
  const showId = requiredText(data, "showId", "Show");
  await assertUnplayed(showId);

  await db.$transaction(async (tx) => {
    await applyTitleChanges(tx, showId);
    await tx.show.update({
      where: { id: showId },
      data: { isFinalized: true, playedAt: new Date() },
    });
  });

  revalidatePath("/", "layout");
  redirect(`/shows/${showId}`);
}
