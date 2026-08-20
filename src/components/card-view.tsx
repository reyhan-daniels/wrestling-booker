"use client";

import { useState } from "react";
import { usePeek } from "@/components/peek/peek-provider";
import { SegmentEditor, type EditableSegment, type PickableTitle } from "@/components/segment-editor";
import type { PickableWrestler } from "@/components/roster-picker";
import { addSegment, deleteSegment, moveSegment, updateSegment } from "@/lib/actions/shows";

export type CardSegment = EditableSegment & {
  order: number;
  typeLabel: string;
  titleName: string | null;
  resultNote: string | null;
  participants: { id: string; name: string; isWinner: boolean }[];
};

/**
 * The card: one ordered list where matches and non-match segments are
 * siblings. Editable forever while the show is booked; frozen once played.
 */
export function CardView({
  showId,
  isFinalized,
  segments,
  wrestlers,
  titles,
}: {
  showId: string;
  isFinalized: boolean;
  segments: CardSegment[];
  wrestlers: PickableWrestler[];
  titles: PickableTitle[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const { open } = usePeek();

  return (
    <div>
      <ol className="space-y-2">
        {segments.map((segment, index) => {
          const winners = segment.participants.filter((p) => p.isWinner);
          const isMatch = segment.type === "MATCH";

          return (
            <li key={segment.id} className="card p-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 w-5 shrink-0 text-center text-xs text-ink-600 tabular-nums">
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="chip-muted">{segment.typeLabel}</span>
                    {segment.isTitleMatch && (
                      <span className="chip-played">{segment.titleName ?? "Title"}</span>
                    )}
                    {segment.stipulation && <span className="chip-plan">{segment.stipulation}</span>}
                  </div>

                  <p className="mt-2 text-sm leading-relaxed">
                    {segment.participants.length === 0 ? (
                      <span className="text-ink-600">No participants yet</span>
                    ) : (
                      segment.participants.map((participant, i) => (
                        <span key={participant.id}>
                          {i > 0 && <span className="text-ink-600">{isMatch ? " vs " : ", "}</span>}
                          <button
                            type="button"
                            onClick={() => open({ kind: "wrestler", id: participant.id })}
                            className={`underline decoration-dotted underline-offset-4 ${
                              participant.isWinner ? "font-semibold text-played-300" : "decoration-ink-600"
                            }`}
                          >
                            {participant.name}
                          </button>
                        </span>
                      ))
                    )}
                  </p>

                  {segment.participants.length === 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        open({
                          kind: "headToHead",
                          a: segment.participants[0].id,
                          b: segment.participants[1].id,
                        })
                      }
                      className="mt-1 text-[11px] text-ink-500 hover:text-plan-300"
                    >
                      head to head ⇄
                    </button>
                  )}

                  {isFinalized && isMatch && (
                    <p className="mt-2 text-xs font-semibold text-played-300">
                      {winners.length
                        ? `${winners.map((w) => w.name).join(" & ")} won`
                        : "No decision"}
                    </p>
                  )}
                  {segment.resultNote && (
                    <p className="mt-1 text-xs text-ink-300">{segment.resultNote}</p>
                  )}
                  {segment.note && <p className="mt-1 text-xs text-ink-500 italic">{segment.note}</p>}
                </div>

                {!isFinalized && (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex gap-1">
                      <form action={moveSegment}>
                        <input type="hidden" name="id" value={segment.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button
                          type="submit"
                          disabled={index === 0}
                          aria-label="Move up"
                          className="flex size-7 items-center justify-center rounded-md border border-ink-700 text-ink-400 disabled:opacity-30"
                        >
                          ↑
                        </button>
                      </form>
                      <form action={moveSegment}>
                        <input type="hidden" name="id" value={segment.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button
                          type="submit"
                          disabled={index === segments.length - 1}
                          aria-label="Move down"
                          className="flex size-7 items-center justify-center rounded-md border border-ink-700 text-ink-400 disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </form>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(editing === segment.id ? null : segment.id)}
                      className="text-[11px] text-ink-500 hover:text-plan-300"
                    >
                      {editing === segment.id ? "Cancel" : "Edit"}
                    </button>
                  </div>
                )}
              </div>

              {editing === segment.id && !isFinalized && (
                <div className="mt-4 border-t border-ink-800 pt-4">
                  <SegmentEditor
                    action={updateSegment}
                    showId={showId}
                    wrestlers={wrestlers}
                    titles={titles}
                    segment={segment}
                    submitLabel="Save segment"
                    onDone={() => setEditing(null)}
                  />
                  <form action={deleteSegment} className="mt-3">
                    <input type="hidden" name="id" value={segment.id} />
                    <button type="submit" className="btn-danger w-full">Remove segment</button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {segments.length === 0 && (
        <div className="card border-dashed p-6 text-center text-sm text-ink-500">
          Nothing booked yet.
        </div>
      )}

      {!isFinalized && (
        <div className="mt-3">
          {adding ? (
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="section-title">New segment</p>
                <button type="button" onClick={() => setAdding(false)} className="text-xs text-ink-500">
                  Cancel
                </button>
              </div>
              <SegmentEditor
                action={addSegment}
                showId={showId}
                wrestlers={wrestlers}
                titles={titles}
                submitLabel="Add to card"
              />
            </div>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="btn-ghost w-full">
              + Add segment
            </button>
          )}
        </div>
      )}
    </div>
  );
}
