import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const WORLD_COOKIE = "wb_world";

/**
 * One world = one save. Several are allowed (they cost nothing, since
 * everything already hangs off worldId), and the active one is remembered in a
 * cookie. An empty database gets its first world on the first page load —
 * creating a container is not the tool "doing something on its own".
 */
export async function getActiveWorld() {
  const store = await cookies();
  const preferred = store.get(WORLD_COOKIE)?.value;

  if (preferred) {
    const world = await db.world.findUnique({ where: { id: preferred } });
    if (world) return world;
  }

  const first = await db.world.findFirst({ orderBy: { createdAt: "asc" } });
  if (first) return first;

  return db.world.create({ data: { name: "My Universe" } });
}

export async function listWorlds() {
  return db.world.findMany({ orderBy: { createdAt: "asc" } });
}
