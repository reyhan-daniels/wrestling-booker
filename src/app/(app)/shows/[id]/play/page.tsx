import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { segmentTypeLabel } from "@/lib/constants";
import { formatDateLong } from "@/lib/dates";
import { BackLink, PageHeader } from "@/components/ui";
import { PlayView, type PlaySegment, type TitleState } from "@/components/play-view";

export default async function PlayShowPage({ params }: PageProps<"/shows/[id]/play">) {
  const { id } = await params;

  const show = await db.show.findUnique({
    where: { id },
    include: {
      companies: { select: { name: true } },
      segments: {
        orderBy: { order: "asc" },
        include: {
          title: { select: { id: true, name: true } },
          participants: {
            orderBy: { order: "asc" },
            include: { wrestler: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!show) notFound();

  // The past is immutable: a played show has no play mode to return to.
  if (show.isFinalized) redirect(`/shows/${id}`);

  const segments: PlaySegment[] = show.segments.map((segment) => ({
    id: segment.id,
    typeLabel: segmentTypeLabel(segment.type, segment.customType),
    isMatch: segment.type === "MATCH",
    stipulation: segment.stipulation,
    isTitleMatch: segment.isTitleMatch,
    titleId: segment.titleId,
    titleName: segment.title?.name ?? null,
    note: segment.note,
    resultNote: segment.resultNote,
    participants: segment.participants.map((p) => ({
      id: p.wrestler.id,
      name: p.wrestler.name,
      isWinner: p.isWinner,
    })),
  }));

  // Current holders of every belt defended tonight, so the confirmation can
  // show exactly what the lineage will do.
  const titleIds = [...new Set(show.segments.flatMap((s) => (s.isTitleMatch && s.titleId ? [s.titleId] : [])))];
  const titles = await db.title.findMany({
    where: { id: { in: titleIds } },
    include: {
      reigns: {
        where: { endedOn: null },
        orderBy: { startedOn: "desc" },
        take: 1,
        include: { holders: { select: { id: true, name: true } } },
      },
    },
  });

  const titleStates: TitleState[] = titles.map((title) => ({
    id: title.id,
    name: title.name,
    holders: title.reigns[0]?.holders ?? [],
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink href={`/shows/${id}`}>Back to the card</BackLink>
      <PageHeader
        title={`Play: ${show.name}`}
        subtitle={`${formatDateLong(show.date)} · ${show.companies.map((c) => c.name).join(" × ")}`}
      />
      <PlayView showId={id} showName={show.name} segments={segments} titleStates={titleStates} />
    </div>
  );
}
