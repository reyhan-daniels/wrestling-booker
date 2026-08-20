"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Alignment, WrestlerStatus } from "@/generated/prisma/enums";
import { MAX_SIGNATURE_MOVES } from "@/lib/constants";
import { bool, date, integer, list, requiredText, text } from "@/lib/form";
import { readPhoto } from "@/lib/photo";
import { getActiveWorld } from "@/lib/world";

function alignmentOf(data: FormData): Alignment {
  const value = String(data.get("align") ?? "");
  return value in Alignment ? (value as Alignment) : Alignment.TWEENER;
}

function statusOf(data: FormData): WrestlerStatus {
  const value = String(data.get("status") ?? "");
  return value in WrestlerStatus ? (value as WrestlerStatus) : WrestlerStatus.ACTIVE;
}

function movesOf(data: FormData): string[] {
  return list(data, "signatureMoves").slice(0, MAX_SIGNATURE_MOVES);
}

export async function createWrestler(data: FormData) {
  const world = await getActiveWorld();
  // Read the portrait before the insert so a bad file fails the whole
  // creation rather than leaving a wrestler with a silently dropped photo.
  const photo = await readPhoto(data);

  const wrestler = await db.$transaction(async (tx) => {
    const created = await tx.wrestler.create({
      data: {
        worldId: world.id,
        name: requiredText(data, "name", "Name"),
        nickname: text(data, "nickname"),
        height: text(data, "height"),
        weight: text(data, "weight"),
        align: alignmentOf(data),
        status: statusOf(data),
        signatureMoves: movesOf(data),
        notes: text(data, "notes"),
      },
    });
    if (photo) {
      await tx.wrestlerPhoto.create({ data: { wrestlerId: created.id, ...photo } });
    }
    return created;
  });
  revalidatePath("/roster");
  redirect(`/roster/${wrestler.id}`);
}

export async function updateWrestler(data: FormData) {
  const id = requiredText(data, "id", "Wrestler");
  const photo = await readPhoto(data);

  if (photo) {
    await db.wrestlerPhoto.upsert({
      where: { wrestlerId: id },
      create: { wrestlerId: id, ...photo },
      update: photo,
    });
  } else if (bool(data, "removePhoto")) {
    await db.wrestlerPhoto.deleteMany({ where: { wrestlerId: id } });
  }

  await db.wrestler.update({
    where: { id },
    data: {
      name: requiredText(data, "name", "Name"),
      nickname: text(data, "nickname"),
      height: text(data, "height"),
      weight: text(data, "weight"),
      align: alignmentOf(data),
      status: statusOf(data),
      signatureMoves: movesOf(data),
      notes: text(data, "notes"),
    },
  });
  revalidatePath("/roster");
  revalidatePath(`/roster/${id}`);
  redirect(`/roster/${id}`);
}

/**
 * Deleting a wrestler would tear results out of played shows, so it is only
 * allowed while they have never appeared on a finalized card. Otherwise:
 * retire them. History is not editable.
 */
export async function deleteWrestler(data: FormData) {
  const id = requiredText(data, "id", "Wrestler");
  const played = await db.segmentParticipant.count({
    where: { wrestlerId: id, segment: { show: { isFinalized: true } } },
  });
  if (played > 0) {
    throw new Error(
      "This wrestler appears on played shows, which are permanent. Set them to retired instead.",
    );
  }
  await db.wrestler.delete({ where: { id } });
  revalidatePath("/roster");
  redirect("/roster");
}

export async function setWrestlerStatus(data: FormData) {
  const id = requiredText(data, "id", "Wrestler");
  await db.wrestler.update({ where: { id }, data: { status: statusOf(data) } });
  revalidatePath(`/roster/${id}`);
  revalidatePath("/roster");
}

// --- Contracts --------------------------------------------------------------

export async function createContract(data: FormData) {
  const world = await getActiveWorld();
  const wrestlerId = requiredText(data, "wrestlerId", "Wrestler");
  const isPrimary = bool(data, "isPrimary");

  await db.$transaction(async (tx) => {
    if (isPrimary) {
      // One home roster at a time; the rest stay as secondary deals.
      await tx.contract.updateMany({ where: { wrestlerId }, data: { isPrimary: false } });
    }
    await tx.contract.create({
      data: {
        worldId: world.id,
        wrestlerId,
        companyId: requiredText(data, "companyId", "Company"),
        isPrimary,
        signedOn: date(data, "signedOn"),
        expiresOn: date(data, "expiresOn"),
        salary: text(data, "salary"),
        notes: text(data, "notes"),
      },
    });
  });

  revalidatePath(`/roster/${wrestlerId}`);
  revalidatePath("/companies");
  revalidatePath("/");
}

export async function updateContract(data: FormData) {
  const id = requiredText(data, "id", "Contract");
  const contract = await db.contract.findUniqueOrThrow({ where: { id } });
  const isPrimary = bool(data, "isPrimary");

  await db.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.contract.updateMany({
        where: { wrestlerId: contract.wrestlerId },
        data: { isPrimary: false },
      });
    }
    await tx.contract.update({
      where: { id },
      data: {
        isPrimary,
        signedOn: date(data, "signedOn"),
        expiresOn: date(data, "expiresOn"),
        salary: text(data, "salary"),
        notes: text(data, "notes"),
      },
    });
  });

  revalidatePath(`/roster/${contract.wrestlerId}`);
  revalidatePath("/");
}

/** "Re-sign" from the expiry prompt: push the date out, change nothing else. */
export async function resignContract(data: FormData) {
  const id = requiredText(data, "id", "Contract");
  const years = integer(data, "years") ?? 1;
  const contract = await db.contract.findUniqueOrThrow({ where: { id } });

  const base = contract.expiresOn && contract.expiresOn > new Date() ? contract.expiresOn : new Date();
  const next = new Date(Date.UTC(base.getUTCFullYear() + years, base.getUTCMonth(), base.getUTCDate()));

  await db.contract.update({ where: { id }, data: { expiresOn: next } });
  revalidatePath("/");
  revalidatePath(`/roster/${contract.wrestlerId}`);
}

/** "Leave as free agent": end the deal but keep it as history. */
export async function endContract(data: FormData) {
  const id = requiredText(data, "id", "Contract");
  const contract = await db.contract.update({
    where: { id },
    data: { endedOn: date(data, "endedOn") ?? new Date(), isPrimary: false },
  });
  revalidatePath("/");
  revalidatePath(`/roster/${contract.wrestlerId}`);
}

export async function deleteContract(data: FormData) {
  const id = requiredText(data, "id", "Contract");
  const contract = await db.contract.delete({ where: { id } });
  revalidatePath(`/roster/${contract.wrestlerId}`);
  revalidatePath("/");
}
