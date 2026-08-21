import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { getActiveWorld, listWorlds } from "@/lib/world";
import { createWorld, renameWorld, switchWorld } from "@/lib/actions/worlds";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Settings — Wrestling Booker" };

export default async function SettingsPage() {
  const [world, worlds] = await Promise.all([getActiveWorld(), listWorlds()]);

  const counts = await db.$transaction([
    db.wrestler.count({ where: { worldId: world.id } }),
    db.company.count({ where: { worldId: world.id } }),
    db.show.count({ where: { worldId: world.id } }),
    db.show.count({ where: { worldId: world.id, isFinalized: true } }),
    db.reign.count({ where: { title: { company: { worldId: world.id } } } }),
  ]);
  const [wrestlers, companies, shows, played, reigns] = counts;

  async function signOut() {
    "use server";
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" />

      <section className="card mb-4 p-4">
        <p className="section-title mb-3">This world</p>
        <form action={renameWorld} className="flex gap-2">
          <input type="hidden" name="id" value={world.id} />
          <input name="name" defaultValue={world.name} required className="field" />
          <button type="submit" className="btn-ghost">Rename</button>
        </form>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {[
            ["Wrestlers", wrestlers],
            ["Companies", companies],
            ["Shows", shows],
            ["Played", played],
            ["Reigns", reigns],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border border-ink-800 bg-ink-900 p-3">
              <dt className="text-xs text-ink-500">{label}</dt>
              <dd className="mt-0.5 text-xl font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink-500">Created {formatDate(world.createdAt)}.</p>
      </section>

      {worlds.length > 1 && (
        <section className="card mb-4 p-4">
          <p className="section-title mb-3">Switch world</p>
          <ul className="space-y-1.5">
            {worlds.map((option) => (
              <li key={option.id}>
                <form action={switchWorld} className="flex items-center justify-between gap-2 rounded-lg border border-ink-800 bg-ink-900 px-3 py-2">
                  <input type="hidden" name="id" value={option.id} />
                  <span className="truncate text-sm">{option.name}</span>
                  {option.id === world.id ? (
                    <span className="chip-plan">Active</span>
                  ) : (
                    <button type="submit" className="text-xs text-plan-300">Switch</button>
                  )}
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card mb-4 p-4">
        <details>
          <summary className="section-title cursor-pointer">New world</summary>
          <form action={createWorld} className="mt-3 flex gap-2">
            <input name="name" required placeholder="World name" className="field" />
            <button type="submit" className="btn-primary">Create</button>
          </form>
          <p className="mt-2 text-xs text-ink-500">
            A separate save with its own wrestlers, companies and history. Nothing is shared.
          </p>
        </details>
      </section>

      <form action={signOut}>
        <button type="submit" className="btn-ghost w-full">Sign out</button>
      </form>
    </div>
  );
}
