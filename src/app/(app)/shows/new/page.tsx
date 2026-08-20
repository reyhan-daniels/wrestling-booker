import { db } from "@/lib/db";
import { todayISO } from "@/lib/dates";
import { getActiveWorld } from "@/lib/world";
import { createShow } from "@/lib/actions/shows";
import { BackLink, Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "New show — Wrestling Booker" };

export default async function NewShowPage({ searchParams }: PageProps<"/shows/new">) {
  const params = await searchParams;
  const preselected = typeof params.company === "string" ? params.company : null;
  const date = typeof params.date === "string" ? params.date : todayISO();

  const world = await getActiveWorld();
  const companies = await db.company.findMany({
    where: { worldId: world.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href="/calendar">Calendar</BackLink>
      <PageHeader title="New show" />

      {companies.length === 0 ? (
        <Empty>Create a company first — a show has to belong to at least one.</Empty>
      ) : (
        <form action={createShow} className="card space-y-4 p-4">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" required placeholder="Summer Showdown" className="field" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="date">Date</label>
              <input id="date" type="date" name="date" required defaultValue={date} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="venue">Venue</label>
              <input id="venue" name="venue" className="field" />
            </div>
          </div>

          <div>
            <span className="label">Company</span>
            <ul className="space-y-1.5">
              {companies.map((company) => (
                <li key={company.id}>
                  <label className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900 px-3 py-2.5 text-sm">
                    <input
                      type="checkbox"
                      name="companyIds"
                      value={company.id}
                      defaultChecked={preselected ? preselected === company.id : companies.length === 1}
                      className="size-4"
                    />
                    {company.name}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="label" htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" rows={2} className="field" />
          </div>

          <button type="submit" className="btn-primary w-full">Create show</button>
        </form>
      )}
    </div>
  );
}
