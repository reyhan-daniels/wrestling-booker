"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SegmentType } from "@/generated/prisma/enums";
import { bool, list, requiredDate, requiredText, text } from "@/lib/form";
import { parseISODate } from "@/lib/dates";
import { episodeNumberFor } from "@/lib/derive";
import { getActiveWorld } from "@/lib/world";

/**
 * The one-way door, enforced in one place. A played show is permanent history;
 * every booking action goes through here first.
 */
async function assertEditable(showId: string) {
  const show = await db.show.findUniqueOrThrow({
    where: { id: showId },
    select: { id: true, isFinalized: true },
  });
  if (show.isFinalized) {
    throw new Error("This show has been played. Played shows are permanent and cannot be edited.");
  }
  return show;
}

function refreshShow(showId: string) {
  revalidatePath(`/shows/${showId}`);
  revalidatePath(`/shows/${showId}/play`);
  revalidatePath("/calendar");
  revalidatePath("/");
}

// --- Shows ------------------------------------------------------------------

export async function createShow(data: FormData) {
  const world = await getActiveWorld();
  const companyIds = list(data, "companyIds");
  if (companyIds.length === 0) throw new Error("Pick at least one company.");

  const show = await db.show.create({
    data: {
      worldId: world.id,
      name: requiredText(data, "name", "Name"),
      date: requiredDate(data, "date", "Date"),
      venue: text(data, "venue"),
      notes: text(data, "notes"),
      color: text(data, "color"),
      seriesId: text(data, "seriesId"),
      companies: { connect: companyIds.map((id) => ({ id })) },
    },
  });

  revalidatePath("/calendar");
  redirect(`/shows/${show.id}`);
}

/**
 * A projected weekly slot has no row until you open it. This turns one into a
 * real, bookable show — the first time you touch it and no earlier.
 */
export async function openSeriesSlot(data: FormData) {
  const world = await getActiveWorld();
  const seriesId = requiredText(data, "seriesId", "Series");
  const date = requiredDate(data, "date", "Date");

  const existing = await db.show.findFirst({ where: { seriesId, date } });
  if (existing) redirect(`/shows/${existing.id}`);

  const series = await db.weeklySeries.findUniqueOrThrow({ where: { id: seriesId } });
  const episode = await episodeNumberFor(seriesId, date);

  const show = await db.show.create({
    data: {
      worldId: world.id,
      name: `${series.name} #${episode ?? ""}`.trim(),
      date,
      seriesId,
      companies: { connect: [{ id: series.companyId }] },
    },
  });

  revalidatePath("/calendar");
  redirect(`/shows/${show.id}`);
}

export async function updateShow(data: FormData) {
  const id = requiredText(data, "id", "Show");
  await assertEditable(id);
  const companyIds = list(data, "companyIds");
  if (companyIds.length === 0) throw new Error("Pick at least one company.");

  await db.show.update({
    where: { id },
    data: {
      name: requiredText(data, "name", "Name"),
      date: requiredDate(data, "date", "Date"),
      venue: text(data, "venue"),
      notes: text(data, "notes"),
      color: text(data, "color"),
      companies: { set: companyIds.map((companyId) => ({ id: companyId })) },
    },
  });
  refreshShow(id);
}

export async function deleteShow(data: FormData) {
  const id = requiredText(data, "id", "Show");
  await assertEditable(id);
  await db.show.delete({ where: { id } });
  revalidatePath("/calendar");
  redirect("/calendar");
}

// --- Segments ---------------------------------------------------------------

function segmentTypeOf(data: FormData): SegmentType {
  const value = String(data.get("type") ?? "");
  return value in SegmentType ? (value as SegmentType) : SegmentType.MATCH;
}

/**
 * Booking = choosing participants. Winners are deliberately not settable here;
 * they only exist in Play.
 */
/**
 * A tournament match is an ordinary match that points at a tournament. Which
 * round it is in is never asked for — it is counted from the matches already
 * on the card.
 *
 * The one thing the tool cannot work out is whether a league match is a block
 * match or the playoff, so that single flag is kept. It is only meaningful in
 * a league that ends in a playoff: a bracket is all bracket, and a league
 * decided by its table has no playoff to be in. Checked against the tournament
 * rather than trusted from the form, so a stale flag cannot creep in.
 */
async function tournamentPlacement(data: FormData, isMatch: boolean) {
  const tournamentId = isMatch ? text(data, "tournamentId") : null;
  if (!tournamentId) return { tournamentId: null, isPlayoff: false };

  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    select: { format: true, playoff: true },
  });
  if (!tournament) return { tournamentId: null, isPlayoff: false };

  const hasPlayoff = tournament.format === "ROUND_ROBIN" && tournament.playoff !== "NONE";
  return { tournamentId, isPlayoff: hasPlayoff && bool(data, "isPlayoff") };
}

export async function addSegment(data: FormData) {
  const showId = requiredText(data, "showId", "Show");
  await assertEditable(showId);

  const last = await db.segment.findFirst({
    where: { showId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const type = segmentTypeOf(data);
  const isMatch = type === SegmentType.MATCH;
  const participantIds = list(data, "participantIds");

  await db.segment.create({
    data: {
      showId,
      order: (last?.order ?? 0) + 1,
      type,
      customType: type === SegmentType.OTHER ? text(data, "customType") : null,
      note: text(data, "note"),
      isTitleMatch: isMatch && bool(data, "isTitleMatch"),
      titleId: isMatch && bool(data, "isTitleMatch") ? text(data, "titleId") : null,
      stipulation: isMatch ? text(data, "stipulation") : null,
      ...(await tournamentPlacement(data, isMatch)),
      participants: {
        create: participantIds.map((wrestlerId, index) => ({ wrestlerId, order: index })),
      },
    },
  });

  refreshShow(showId);
}

export async function updateSegment(data: FormData) {
  const id = requiredText(data, "id", "Segment");
  const segment = await db.segment.findUniqueOrThrow({ where: { id }, select: { showId: true } });
  await assertEditable(segment.showId);

  const type = segmentTypeOf(data);
  const isMatch = type === SegmentType.MATCH;
  const participantIds = list(data, "participantIds");
  const placement = await tournamentPlacement(data, isMatch);

  await db.$transaction(async (tx) => {
    await tx.segment.update({
      where: { id },
      data: {
        type,
        customType: type === SegmentType.OTHER ? text(data, "customType") : null,
        note: text(data, "note"),
        isTitleMatch: isMatch && bool(data, "isTitleMatch"),
        titleId: isMatch && bool(data, "isTitleMatch") ? text(data, "titleId") : null,
        stipulation: isMatch ? text(data, "stipulation") : null,
        ...placement,
      },
    });

    // Replace the participant list wholesale — simpler than diffing, and any
    // winner flag is meaningless until the show is played anyway.
    await tx.segmentParticipant.deleteMany({ where: { segmentId: id } });
    if (participantIds.length) {
      await tx.segmentParticipant.createMany({
        data: participantIds.map((wrestlerId, index) => ({ segmentId: id, wrestlerId, order: index })),
      });
    }
  });

  refreshShow(segment.showId);
}

export async function deleteSegment(data: FormData) {
  const id = requiredText(data, "id", "Segment");
  const segment = await db.segment.findUniqueOrThrow({ where: { id }, select: { showId: true } });
  await assertEditable(segment.showId);

  await db.$transaction(async (tx) => {
    await tx.segment.delete({ where: { id } });
    const rest = await tx.segment.findMany({
      where: { showId: segment.showId },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    // Keep positions contiguous so "move up / move down" stays predictable.
    for (const [index, row] of rest.entries()) {
      await tx.segment.update({ where: { id: row.id }, data: { order: index + 1 } });
    }
  });

  refreshShow(segment.showId);
}

export async function moveSegment(data: FormData) {
  const id = requiredText(data, "id", "Segment");
  const direction = String(data.get("direction") ?? "up") === "down" ? 1 : -1;

  const segment = await db.segment.findUniqueOrThrow({
    where: { id },
    select: { id: true, showId: true, order: true },
  });
  await assertEditable(segment.showId);

  const neighbour = await db.segment.findFirst({
    where:
      direction === -1
        ? { showId: segment.showId, order: { lt: segment.order } }
        : { showId: segment.showId, order: { gt: segment.order } },
    orderBy: { order: direction === -1 ? "desc" : "asc" },
    select: { id: true, order: true },
  });
  if (!neighbour) return;

  await db.$transaction([
    db.segment.update({ where: { id: segment.id }, data: { order: neighbour.order } }),
    db.segment.update({ where: { id: neighbour.id }, data: { order: segment.order } }),
  ]);

  refreshShow(segment.showId);
}

/** Copy a whole card onto a new date — the usual way to build next week. */
export async function duplicateShow(data: FormData) {
  const world = await getActiveWorld();
  const id = requiredText(data, "id", "Show");
  const source = await db.show.findUniqueOrThrow({
    where: { id },
    include: {
      companies: { select: { id: true } },
      segments: { include: { participants: true }, orderBy: { order: "asc" } },
    },
  });

  const newDate = data.get("date") ? parseISODate(String(data.get("date"))) : source.date;

  const copy = await db.show.create({
    data: {
      worldId: world.id,
      name: requiredText(data, "name", "Name"),
      date: newDate,
      venue: source.venue,
      seriesId: source.seriesId,
      companies: { connect: source.companies.map((c) => ({ id: c.id })) },
      segments: {
        create: source.segments.map((segment) => ({
          order: segment.order,
          type: segment.type,
          customType: segment.customType,
          note: segment.note,
          isTitleMatch: segment.isTitleMatch,
          titleId: segment.titleId,
          stipulation: segment.stipulation,
          // Results are never copied. A copy is a plan, not a result.
          participants: {
            create: segment.participants.map((p) => ({ wrestlerId: p.wrestlerId, order: p.order })),
          },
        })),
      },
    },
  });

  revalidatePath("/calendar");
  redirect(`/shows/${copy.id}`);
}

/** Persist a dragged card order. Positions stay 1-based and contiguous. */
export async function reorderSegments(data: FormData) {
  const showId = requiredText(data, "showId", "Show");
  await assertEditable(showId);
  const ids = list(data, "ids");

  await db.$transaction(
    ids.map((id, index) =>
      db.segment.updateMany({ where: { id, showId }, data: { order: index + 1 } }),
    ),
  );

  refreshShow(showId);
}
