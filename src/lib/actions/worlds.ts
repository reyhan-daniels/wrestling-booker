"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { bool, requiredText } from "@/lib/form";
import { WORLD_COOKIE } from "@/lib/world";

const YEAR = 365 * 24 * 60 * 60;

export async function createWorld(data: FormData) {
  const world = await db.world.create({ data: { name: requiredText(data, "name", "Name") } });
  const store = await cookies();
  store.set(WORLD_COOKIE, world.id, { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
  redirect("/");
}

export async function switchWorld(data: FormData) {
  const id = requiredText(data, "id", "World");
  await db.world.findUniqueOrThrow({ where: { id } });
  const store = await cookies();
  store.set(WORLD_COOKIE, id, { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Turning portraits off is presentational: no bytes are deleted, so turning
 * them back on restores every photo that was already uploaded.
 */
export async function setPhotosEnabled(data: FormData) {
  const id = requiredText(data, "id", "World");
  await db.world.update({ where: { id }, data: { photosEnabled: bool(data, "enabled") } });
  revalidatePath("/", "layout");
  redirect("/settings");
}

export async function renameWorld(data: FormData) {
  const id = requiredText(data, "id", "World");
  await db.world.update({ where: { id }, data: { name: requiredText(data, "name", "Name") } });
  revalidatePath("/", "layout");
  redirect("/settings");
}
