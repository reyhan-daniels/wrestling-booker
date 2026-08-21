"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bool, list, requiredText, text } from "@/lib/form";
import { getActiveWorld } from "@/lib/world";

/**
 * A unit is a tag team, a trio or a faction depending only on how many people
 * are in it, so nothing here writes a "kind". Membership is set wholesale:
 * the form always posts the full roster of the unit.
 */
export async function createGroup(data: FormData) {
  const world = await getActiveWorld();
  const memberIds = list(data, "memberIds");

  const group = await db.group.create({
    data: {
      worldId: world.id,
      name: requiredText(data, "name", "Name"),
      color: text(data, "color"),
      notes: text(data, "notes"),
      members: { connect: memberIds.map((id) => ({ id })) },
    },
  });
  revalidatePath("/groups");
  revalidatePath("/roster");
  redirect(`/groups/${group.id}`);
}

export async function updateGroup(data: FormData) {
  const id = requiredText(data, "id", "Unit");
  const memberIds = list(data, "memberIds");

  await db.group.update({
    where: { id },
    data: {
      name: requiredText(data, "name", "Name"),
      color: text(data, "color"),
      notes: text(data, "notes"),
      isActive: !bool(data, "disbanded"),
      // `set` rather than connect/disconnect: the form knows the whole roster,
      // so replacing it wholesale is what "save" means here.
      members: { set: memberIds.map((memberId) => ({ id: memberId })) },
    },
  });
  revalidatePath("/groups");
  revalidatePath(`/groups/${id}`);
  revalidatePath("/roster");
  redirect(`/groups/${id}`);
}

/**
 * Unlike a wrestler, a unit holds no results of its own — its record is
 * derived from its members' matches — so deleting one loses nothing but the
 * grouping itself.
 */
export async function deleteGroup(data: FormData) {
  const id = requiredText(data, "id", "Unit");
  await db.group.delete({ where: { id } });
  revalidatePath("/groups");
  revalidatePath("/roster");
  redirect("/groups");
}

export async function reorderGroups(data: FormData) {
  const world = await getActiveWorld();
  const ids = list(data, "ids");
  await db.$transaction(
    ids.map((id, index) =>
      db.group.updateMany({ where: { id, worldId: world.id }, data: { order: index + 1 } }),
    ),
  );
  revalidatePath("/groups");
}
