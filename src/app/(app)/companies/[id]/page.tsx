import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CADENCE_LABELS } from "@/lib/constants";
import { getCurrentChampions } from "@/lib/derive";
import { createSeries, createTitle, deleteCompany, deleteSeries, updateCompany, updateSeries } from "@/lib/actions/companies";
import { BackLink, Empty, PageHeader, StateChip } from "@/components/ui";
import { PeekName } from "@/components/peek/peek-triggers";
import { SortableTitles } from "@/components/sortable-titles";
import { ColorPicker } from "@/components/color-picker";
import { formatDate, formatDuration, toISODate, todayISO, weekdayName } from "@/lib/dates";

export default async function CompanyPage({ params }: PageProps<"/companies/[id]">) {
  const { id } = await params;

  const company = await db.company.findUnique({
    where: { id },
    include: {
      titles: { orderBy: [{ order: "asc" }, { name: "asc" }] },
      series: { orderBy: { startsOn: "asc" } },
      contracts: {
        where: { endedOn: null },
        include: { wrestler: { select: { id: true, name: true, status: true } } },
        orderBy: [{ isPrimary: "desc" }, { wrestler: { name: "asc" } }],
      },
    },
  });
  if (!company) notFound();

  const [champions, shows] = await Promise.all([
    getCurrentChampions(id, company.worldId),
    db.show.findMany({
      where: { companies: { some: { id } } },
      orderBy: { date: "desc" },
      take: 12,
      include: { _count: { select: { segments: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <BackLink href="/companies">Companies</BackLink>
      <PageHeader
        title={company.name}
        subtitle={company.abbreviation ?? undefined}
        action={
          <Link href={`/shows/new?company=${id}`} className="btn-primary">
            Book a show
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <p className="section-title mb-3">Titles</p>
          {company.titles.length === 0 ? (
            <p className="text-sm text-ink-500">No titles yet.</p>
          ) : (
            <SortableTitles
              companyId={id}
              titles={company.titles.map((title) => {
                const reign = champions.find((c) => c.title.id === title.id);
                return {
                  id: title.id,
                  name: title.name,
                  isActive: title.isActive,
                  champion: reign ? reign.holders.map((h) => h.name).join(" & ") : null,
                  detail: reign ? formatDuration(reign.days) : null,
                };
              })}
            />
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-plan-300">+ Add title</summary>
            <form action={createTitle} className="mt-3 space-y-3">
              <input type="hidden" name="companyId" value={id} />
              <input name="name" required placeholder="Title name" className="field" />
              <button type="submit" className="btn-primary w-full">Add title</button>
            </form>
          </details>
        </section>

        <section className="card p-4">
          <p className="section-title mb-3">Weekly series</p>
          {company.series.length === 0 ? (
            <p className="text-sm text-ink-500">None.</p>
          ) : (
            <ul className="space-y-2">
              {company.series.map((series) => (
                <li key={series.id} className="rounded-[3px] border border-ink-800 bg-ink-900 p-3">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-3 shrink-0 rounded-[2px] border border-ink-700"
                      style={{ background: series.color ?? company.color ?? "transparent" }}
                    />
                    <span className="name min-w-0 flex-1 truncate">{series.name}</span>
                    <form action={deleteSeries}>
                      <input type="hidden" name="id" value={series.id} />
                      <button type="submit" className="display text-[10px] tracking-widest text-ink-600 hover:text-danger-400">
                        Remove
                      </button>
                    </form>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    {CADENCE_LABELS[series.cadence]} · {weekdayName(series.startsOn)}s · from{" "}
                    {formatDate(series.startsOn)}
                    {series.endedOn ? ` · ended ${formatDate(series.endedOn)}` : ""}
                  </p>

                  <details className="mt-2">
                    <summary className="display cursor-pointer text-[10px] tracking-widest text-ink-500">
                      Edit
                    </summary>
                    <form action={updateSeries} className="mt-3 space-y-3">
                      <input type="hidden" name="id" value={series.id} />
                      <input name="name" required defaultValue={series.name} className="field" />
                      <div className="grid grid-cols-2 gap-3">
                        <select name="cadence" defaultValue={series.cadence} className="field">
                          {Object.entries(CADENCE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        <input type="date" name="startsOn" required defaultValue={toISODate(series.startsOn)} className="field" />
                      </div>
                      <ColorPicker name="color" defaultValue={series.color} label="Calendar colour" />
                      <button type="submit" className="btn-primary w-full">Save series</button>
                    </form>
                  </details>
                </li>
              ))}
            </ul>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-plan-300">+ Add series</summary>
            <form action={createSeries} className="mt-3 space-y-3">
              <input type="hidden" name="companyId" value={id} />
              <input name="name" required placeholder="Series name" className="field" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="cadence">Cadence</label>
                  <select id="cadence" name="cadence" className="field">
                    {Object.entries(CADENCE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="startsOn">First episode</label>
                  <input id="startsOn" type="date" name="startsOn" required defaultValue={todayISO()} className="field" />
                </div>
              </div>
              <ColorPicker name="color" label="Calendar colour" />
              <button type="submit" className="btn-primary w-full">Add series</button>
            </form>
          </details>
        </section>

        <section className="card p-4 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="section-title">Roster ({company.contracts.length})</p>
            <Link href={`/roster/new?company=${id}`} className="btn-ghost px-2.5 py-1 text-[11px]">
              + New wrestler
            </Link>
          </div>
          {company.contracts.length === 0 ? (
            <Empty>
              Nobody under contract.{" "}
              <Link href={`/roster/new?company=${id}`} className="text-plan-300">
                Create the first one.
              </Link>
            </Empty>
          ) : (
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {company.contracts.map((contract) => (
                <li key={contract.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-800 bg-ink-900 px-3 py-2">
                  <PeekName id={contract.wrestler.id} className="text-sm">
                    {contract.wrestler.name}
                  </PeekName>
                  <span className="flex shrink-0 gap-1.5">
                    {contract.isPrimary && <span className="chip-plan">Primary</span>}
                    {contract.wrestler.status === "RETIRED" && <span className="chip-muted">Retired</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4 lg:col-span-2">
          <p className="section-title mb-3">Shows</p>
          {shows.length === 0 ? (
            <Empty>No shows yet.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {shows.map((show) => (
                <li key={show.id} className="flex items-center justify-between gap-2 rounded-lg border border-ink-800 bg-ink-900 px-3 py-2">
                  <Link href={`/shows/${show.id}`} className="truncate text-sm hover:text-plan-300">
                    {show.name}
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-ink-500">{formatDate(show.date)}</span>
                    <StateChip isFinalized={show.isFinalized} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4 lg:col-span-2">
          <details>
            <summary className="section-title cursor-pointer">Company settings</summary>
            <form action={updateCompany} className="mt-4 space-y-3">
              <input type="hidden" name="id" value={id} />
              <div>
                <label className="label" htmlFor="name">Name</label>
                <input id="name" name="name" required defaultValue={company.name} className="field" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="abbreviation">Abbreviation</label>
                  <input id="abbreviation" name="abbreviation" defaultValue={company.abbreviation ?? ""} className="field" />
                </div>
                <div>
                  <label className="label" htmlFor="color">Accent colour</label>
                  <input id="color" name="color" type="color" defaultValue={company.color ?? "#3b82f6"} className="field h-11 p-1" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="notes">Notes</label>
                <textarea id="notes" name="notes" rows={3} defaultValue={company.notes ?? ""} className="field" />
              </div>
              <button type="submit" className="btn-primary">Save company</button>
            </form>

            <form action={deleteCompany} className="mt-6">
              <input type="hidden" name="id" value={id} />
              <button type="submit" className="btn-danger">Delete company</button>
            </form>
          </details>
        </section>
      </div>
    </div>
  );
}
