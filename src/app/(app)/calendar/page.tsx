import Link from "next/link";
import { db } from "@/lib/db";
import { addMonths, endOfMonth, formatDate, formatMonth, parseISODate, startOfMonth, toISODate, todayISO } from "@/lib/dates";
import { getCalendar } from "@/lib/derive";
import { getActiveWorld } from "@/lib/world";
import { openSeriesSlot } from "@/lib/actions/shows";
import { Empty, PageHeader, StateChip } from "@/components/ui";

export const metadata = { title: "Calendar — Wrestling Booker" };

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const params = await searchParams;
  const monthParam = typeof params.m === "string" ? params.m : null;
  const companyId = typeof params.company === "string" ? params.company : undefined;

  const anchor = monthParam ? parseISODate(`${monthParam}-01`) : new Date();
  const from = startOfMonth(anchor);
  const to = endOfMonth(anchor);

  const world = await getActiveWorld();
  const [entries, companies] = await Promise.all([
    getCalendar(world.id, from, to, companyId),
    db.company.findMany({ where: { worldId: world.id }, orderBy: { name: "asc" } }),
  ]);

  const previous = toISODate(addMonths(from, -1)).slice(0, 7);
  const next = toISODate(addMonths(from, 1)).slice(0, 7);
  const today = todayISO();

  const query = (month: string) =>
    `/calendar?m=${month}${companyId ? `&company=${companyId}` : ""}`;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Calendar"
        subtitle="A view of every show, not a stored thing."
        action={<Link href="/shows/new" className="btn-primary">New show</Link>}
      />

      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={query(previous)} className="btn-ghost px-3 py-1.5">‹</Link>
        <span className="text-sm font-semibold">{formatMonth(from)}</span>
        <Link href={query(next)} className="btn-ghost px-3 py-1.5">›</Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link
          href={`/calendar?m=${toISODate(from).slice(0, 7)}`}
          className={`chip ${!companyId ? "chip-plan" : "chip-muted"}`}
        >
          All
        </Link>
        {companies.map((company) => (
          <Link
            key={company.id}
            href={`/calendar?m=${toISODate(from).slice(0, 7)}&company=${company.id}`}
            className={`chip ${companyId === company.id ? "chip-plan" : "chip-muted"}`}
          >
            {company.abbreviation ?? company.name}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <Empty>
          Nothing this month. Add a weekly series to a company, or{" "}
          <Link href="/shows/new" className="text-plan-300 underline">create a special event</Link>.
        </Empty>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => {
            const isToday = toISODate(entry.date) === today;
            return (
              <li
                key={entry.id}
                className={`card p-3 ${entry.kind === "slot" ? "border-dashed bg-transparent" : ""} ${
                  isToday ? "ring-1 ring-plan-500/50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 shrink-0 text-center">
                    <div className="text-lg font-bold tabular-nums leading-none">
                      {entry.date.getUTCDate()}
                    </div>
                    <div className="text-[10px] tracking-wide text-ink-500 uppercase">
                      {formatDate(entry.date).slice(0, 3)}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    {entry.kind === "show" ? (
                      <Link href={`/shows/${entry.id}`} className="font-medium hover:text-plan-300">
                        {entry.name}
                      </Link>
                    ) : (
                      <span className="font-medium text-ink-400">{entry.name}</span>
                    )}
                    <p className="mt-0.5 truncate text-xs text-ink-500">
                      {entry.companies.map((c) => c.name).join(" × ")}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {entry.kind === "show" ? (
                      <div className="text-right">
                        <StateChip isFinalized={entry.isFinalized} />
                        <p className="mt-1 text-[10px] text-ink-600">
                          {entry.segmentCount} segment{entry.segmentCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    ) : (
                      <form action={openSeriesSlot}>
                        <input type="hidden" name="seriesId" value={entry.seriesId} />
                        <input type="hidden" name="date" value={toISODate(entry.date)} />
                        <button type="submit" className="btn-ghost px-2.5 py-1 text-xs">
                          Book
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs text-ink-600">
        Dashed entries are projected weekly episodes. They only become real when you book them.
      </p>
    </div>
  );
}
