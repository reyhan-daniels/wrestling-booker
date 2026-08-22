"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PlayoffFormat, TournamentFormat } from "@/generated/prisma/enums";
import { bool, integer, list, requiredText, text } from "@/lib/form";
import { getActiveWorld } from "@/lib/world";

function formatOf(data: FormData): TournamentFormat {
  const value = String(data.get("format") ?? "");
  return value in TournamentFormat ? (value as TournamentFormat) : TournamentFormat.ROUND_ROBIN;
}

function playoffOf(data: FormData): PlayoffFormat {
  const value = String(data.get("playoff") ?? "");
  return value in PlayoffFormat ? (value as PlayoffFormat) : PlayoffFormat.NONE;
}

/**
 * The field is posted as `entrants`, each one either `w:<wrestlerId>` or
 * `g:<groupId>`, optionally followed by `@<block>`. One list keeps the order
 * the form shows, and keeps a wrestler and a unit from ever being the same
 * entry.
 */
type EntrantRow = { wrestlerId: string | null; groupId: string | null; block: string | null; order: number };

function entrantsOf(data: FormData): EntrantRow[] {
  return list(data, "entrants").flatMap<EntrantRow>((raw, order) => {
    const [ref, block] = raw.split("@");
    const id = ref.slice(2);
    if (!id) return [];
    if (ref.startsWith("w:")) return [{ wrestlerId: id, groupId: null, block: block || null, order }];
    if (ref.startsWith("g:")) return [{ wrestlerId: null, groupId: id, block: block || null, order }];
    return [];
  });
}

function detailsOf(data: FormData) {
  return {
    name: requiredText(data, "name", "Name"),
    format: formatOf(data),
    companyId: text(data, "companyId"),
    color: text(data, "color"),
    notes: text(data, "notes"),
    pointsWin: integer(data, "pointsWin") ?? 2,
    pointsDraw: integer(data, "pointsDraw") ?? 1,
    blockCount: Math.min(Math.max(integer(data, "blockCount") ?? 1, 1), 8),
    playoff: playoffOf(data),
  };
}

export async function createTournament(data: FormData) {
  const world = await getActiveWorld();
  const tournament = await db.tournament.create({
    data: {
      worldId: world.id,
      ...detailsOf(data),
      entrants: { create: entrantsOf(data) },
    },
  });
  revalidatePath("/tournaments");
  redirect(`/tournaments/${tournament.id}`);
}

export async function updateTournament(data: FormData) {
  const id = requiredText(data, "id", "Tournament");

  await db.$transaction(async (tx) => {
    await tx.tournament.update({
      where: { id },
      data: { ...detailsOf(data), isComplete: bool(data, "isComplete") },
    });
    // The field is replaced wholesale, like a unit's membership. Entrants hold
    // no results of their own — the matches do — so nothing is lost.
    await tx.tournamentEntrant.deleteMany({ where: { tournamentId: id } });
    await tx.tournamentEntrant.createMany({
      data: entrantsOf(data).map((entrant) => ({ ...entrant, tournamentId: id })),
    });
  });

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${id}`);
  redirect(`/tournaments/${id}`);
}

/**
 * Deleting a tournament keeps every match that was in it. The segments simply
 * stop pointing here (onDelete: SetNull) and go on counting towards records
 * and reigns, because they were always ordinary matches.
 */
export async function deleteTournament(data: FormData) {
  const id = requiredText(data, "id", "Tournament");
  await db.tournament.delete({ where: { id } });
  revalidatePath("/tournaments");
  redirect("/tournaments");
}
