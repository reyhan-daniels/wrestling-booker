import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, formatDuration } from "@/lib/dates";
import { getTitleHistory } from "@/lib/derive";
import { updateTitle, deleteTitle } from "@/lib/actions/companies";
import { BackLink, Empty, PageHeader } from "@/components/ui";
import { PeekName } from "@/components/peek/peek-triggers";

export default async function TitlePage({ params }: PageProps<"/titles/[id]">) {
  const { id } = await params;
  const title = await getTitleHistory(id);
  if (!title) notFound();

  const longest = [...title.reigns].sort((a, b) => b.days - a.days)[0];

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/titles">Titles</BackLink>
      <PageHeader title={title.name} subtitle={title.company.name} />

      <div className="card mb-4 border-played-500/30 bg-played-500/5 p-4">
        <p className="section-title">Current champion</p>
        {title.current ? (
          <>
            <p className="mt-1 text-xl font-bold text-played-300">
              {title.current.holders.map((holder, index) => (
                <span key={holder.id}>
                  {index > 0 && " & "}
                  <PeekName id={holder.id}>{holder.name}</PeekName>
                </span>
              ))}
            </p>
            <p className="mt-1 text-sm text-ink-400">
              Since {formatDate(title.current.startedOn)} · {formatDuration(title.current.days)}
              {title.current.wonAtShow && (
                <>
                  {" · won at "}
                  <Link href={`/shows/${title.current.wonAtShow.id}`} className="underline decoration-dotted">
                    {title.current.wonAtShow.name}
                  </Link>
                </>
              )}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-ink-400">Vacant</p>
        )}
      </div>

      {longest && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="card p-3">
            <p className="section-title">Reigns</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{title.reigns.length}</p>
          </div>
          <div className="card p-3">
            <p className="section-title">Longest</p>
            <p className="mt-1 truncate text-sm font-semibold">
              {longest.holders.map((h) => h.name).join(" & ")}
            </p>
            <p className="text-xs text-ink-500">{formatDuration(longest.days)}</p>
          </div>
        </div>
      )}

      <section className="card p-4">
        <p className="section-title mb-3">Lineage</p>
        {title.reigns.length === 0 ? (
          <Empty>No reigns yet.</Empty>
        ) : (
          <ol className="space-y-2">
            {title.reigns.map((reign) => (
              <li
                key={reign.id}
                className={`rounded-lg border p-3 ${
                  reign.isCurrent ? "border-played-500/40 bg-played-500/5" : "border-ink-800 bg-ink-900"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium">
                    <span className="mr-2 text-xs text-ink-600">#{reign.number}</span>
                    {reign.holders.map((holder, index) => (
                      <span key={holder.id}>
                        {index > 0 && " & "}
                        <PeekName id={holder.id}>{holder.name}</PeekName>
                      </span>
                    ))}
                  </p>
                  <span className="shrink-0 text-xs text-ink-400">{formatDuration(reign.days)}</span>
                </div>
                <p className="mt-1 text-xs text-ink-500">
                  {formatDate(reign.startedOn)} — {reign.endedOn ? formatDate(reign.endedOn) : "present"}
                </p>
                <p className="mt-1 text-xs text-ink-600">
                  {reign.wonAtShow && (
                    <Link href={`/shows/${reign.wonAtShow.id}`} className="underline decoration-dotted">
                      Won at {reign.wonAtShow.name}
                    </Link>
                  )}
                  {reign.lostAtShow && (
                    <>
                      {" · "}
                      <Link href={`/shows/${reign.lostAtShow.id}`} className="underline decoration-dotted">
                        Lost at {reign.lostAtShow.name}
                      </Link>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="card mt-4 p-4">
        <details>
          <summary className="section-title cursor-pointer">Title settings</summary>
          <form action={updateTitle} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={id} />
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" name="name" required defaultValue={title.name} className="field" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={title.isActive} className="size-4" />
              Active
            </label>
            <div>
              <label className="label" htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" rows={2} defaultValue={title.notes ?? ""} className="field" />
            </div>
            <button type="submit" className="btn-primary">Save title</button>
          </form>

          <form action={deleteTitle} className="mt-6">
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="btn-danger">Delete title</button>
          </form>
        </details>
      </section>
    </div>
  );
}
