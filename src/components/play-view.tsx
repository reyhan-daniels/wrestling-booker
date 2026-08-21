"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePeek } from "@/components/peek/peek-provider";
import { finalizeShow, saveResult } from "@/lib/actions/play";

export type PlaySegment = {
  id: string;
  typeLabel: string;
  isMatch: boolean;
  stipulation: string | null;
  isTitleMatch: boolean;
  titleId: string | null;
  titleName: string | null;
  note: string | null;
  resultNote: string | null;
  participants: { id: string; name: string; isWinner: boolean }[];
};

export type TitleState = {
  id: string;
  name: string;
  holders: { id: string; name: string }[];
};

/**
 * Play = choosing winners. Working through the card is still reversible; the
 * one-way door is the Finalize button at the bottom, and it says so.
 */
export function PlayView({
  showId,
  showName,
  segments,
  titleStates,
}: {
  showId: string;
  showName: string;
  segments: PlaySegment[];
  titleStates: TitleState[];
}) {
  const router = useRouter();
  const { open } = usePeek();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const [winners, setWinners] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      segments.map((segment) => [segment.id, segment.participants.filter((p) => p.isWinner).map((p) => p.id)]),
    ),
  );
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(segments.map((segment) => [segment.id, segment.resultNote ?? ""])),
  );

  function persist(segmentId: string, nextWinners: string[], nextNote: string) {
    const data = new FormData();
    data.set("segmentId", segmentId);
    data.set("resultNote", nextNote);
    for (const id of nextWinners) data.append("winnerIds", id);
    startTransition(async () => {
      await saveResult(data);
    });
  }

  function toggleWinner(segmentId: string, wrestlerId: string) {
    const current = winners[segmentId] ?? [];
    // Tap to set the winner, tap again to clear it. Tag matches just get more
    // than one name lit up.
    const next = current.includes(wrestlerId)
      ? current.filter((id) => id !== wrestlerId)
      : [...current, wrestlerId];
    setWinners({ ...winners, [segmentId]: next });
    persist(segmentId, next, notes[segmentId] ?? "");
  }

  const matches = segments.filter((segment) => segment.isMatch);
  const decided = matches.filter((segment) => (winners[segment.id] ?? []).length > 0).length;

  // What finalizing would do to the belts, worked out from the winners chosen.
  const titleChanges = matches
    .filter((segment) => segment.isTitleMatch && segment.titleId)
    .map((segment) => {
      const chosen = winners[segment.id] ?? [];
      const state = titleStates.find((title) => title.id === segment.titleId);
      if (!state || chosen.length === 0) return null;

      const holderIds = state.holders.map((h) => h.id);
      const unchanged =
        holderIds.length === chosen.length && chosen.every((id) => holderIds.includes(id));
      const names = chosen
        .map((id) => segment.participants.find((p) => p.id === id)?.name ?? "?")
        .join(" & ");

      return {
        segmentId: segment.id,
        titleName: state.name,
        from: state.holders.map((h) => h.name).join(" & ") || "Vacant",
        to: names,
        unchanged,
      };
    })
    .filter((change): change is NonNullable<typeof change> => change !== null);

  return (
    <div>
      <div className="card mb-4 flex items-center justify-between p-3">
        <div>
          <p className="section-title">Progress</p>
          <p className="mt-0.5 text-sm">
            {decided} of {matches.length} match{matches.length === 1 ? "" : "es"} decided
          </p>
        </div>
        {pending && <span className="text-xs text-ink-500">Saving…</span>}
      </div>

      <ol className="space-y-2">
        {segments.map((segment, index) => {
          const chosen = winners[segment.id] ?? [];
          return (
            <li key={segment.id} className="card p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-5 text-center text-xs text-ink-600 tabular-nums">{index + 1}</span>
                <span className="chip-muted">{segment.typeLabel}</span>
                {segment.isTitleMatch && (
                  <span className="chip-played">{segment.titleName ?? "Title"}</span>
                )}
                {segment.stipulation && <span className="chip-plan">{segment.stipulation}</span>}
              </div>

              {segment.note && <p className="mt-2 text-xs text-ink-500 italic">{segment.note}</p>}

              {segment.isMatch ? (
                <>
                  <p className="mt-3 mb-2 text-[11px] tracking-wide text-ink-500 uppercase">
                    Tap the winner
                  </p>
                  <ul className="space-y-1.5">
                    {segment.participants.map((participant) => {
                      const isWinner = chosen.includes(participant.id);
                      return (
                        <li key={participant.id} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleWinner(segment.id, participant.id)}
                            className={`flex min-w-0 flex-1 items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors ${
                              isWinner
                                ? "border-played-500 bg-played-500/15 text-played-300"
                                : "border-ink-700 bg-ink-900 text-ink-200"
                            }`}
                          >
                            <span className="truncate text-sm font-medium">{participant.name}</span>
                            {isWinner && <span className="ml-2 shrink-0 text-xs font-bold">WINNER</span>}
                          </button>
                          <button
                            type="button"
                            onClick={() => open({ kind: "wrestler", id: participant.id })}
                            className="shrink-0 px-2 text-[11px] text-ink-500 hover:text-plan-300"
                          >
                            peek
                          </button>
                        </li>
                      );
                    })}
                    {segment.participants.length === 0 && (
                      <li className="text-sm text-ink-600">No participants were booked.</li>
                    )}
                  </ul>

                  <div className="mt-3">
                    <label className="label" htmlFor={`note-${segment.id}`}>
                      How did it finish?
                    </label>
                    <input
                      id={`note-${segment.id}`}
                      value={notes[segment.id] ?? ""}
                      onChange={(event) => setNotes({ ...notes, [segment.id]: event.target.value })}
                      onBlur={() => persist(segment.id, chosen, notes[segment.id] ?? "")}
                      placeholder="Interference from the ramp, roll-up out of nowhere…"
                      className="field"
                    />
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-ink-300">
                  {segment.participants.map((p) => p.name).join(", ") || "—"}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-6 card border-played-500/30 bg-played-500/5 p-4">
        <p className="text-sm font-semibold text-played-300">Finalize {showName}</p>

        {titleChanges.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {titleChanges.map((change) => (
              <li key={change.segmentId} className="rounded-lg border border-ink-700 bg-ink-900 p-2.5 text-xs">
                <span className="font-semibold text-played-300">{change.titleName}</span>
                <span className="mt-0.5 block text-ink-400">
                  {change.unchanged ? `${change.to} retains` : `${change.from} → ${change.to}`}
                </span>
              </li>
            ))}
          </ul>
        )}

        {decided < matches.length && (
          <p className="mt-2 text-xs text-ink-400">
            {matches.length - decided === 1
              ? "1 match has no winner."
              : `${matches.length - decided} matches have no winner.`}
          </p>
        )}

        {confirming ? (
          <div className="mt-4 space-y-2">
            <form
              action={async (data: FormData) => {
                await finalizeShow(data);
                router.refresh();
              }}
            >
              <input type="hidden" name="showId" value={showId} />
              <button type="submit" className="btn-accent w-full">
                Yes, finalize
              </button>
            </form>
            <button type="button" onClick={() => setConfirming(false)} className="btn-ghost w-full">
              Not yet
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="btn-accent mt-4 w-full">
            Finalize show
          </button>
        )}
      </div>
    </div>
  );
}
