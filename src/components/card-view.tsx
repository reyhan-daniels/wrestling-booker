"use client";

import { useState, useTransition } from "react";
import { usePeek } from "@/components/peek/peek-provider";
import { SortableList } from "@/components/sortable-list";
import { SegmentEditor, type EditableSegment, type PickableTitle } from "@/components/segment-editor";
import type { PickableWrestler } from "@/components/roster-picker";
import { addSegment, deleteSegment, reorderSegments, updateSegment } from "@/lib/actions/shows";

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
  const [pending, startTransition] = useTransition();
  const { open } = usePeek();

  function saveOrder(ids: string[]) {
    const data = new FormData();
    data.set("showId", showId);
    for (const id of ids) data.append("ids", id);
    startTransition(async () => {
      await reorderSegments(data);
    });
  }

  return (
    <div>
      <SortableList
        items={segments}
        onReorder={saveOrder}
        disabled={isFinalized}
        className={`space-y-2 ${pending ? "opacity-70 transition-opacity" : ""}`}
        renderItem={(segment, handle, index) => {
          const winners = segment.participants.filter((p) => p.isWinner);
          const isMatch = segment.type === "MATCH";

          return (
            <div className="card-raised p-3">
              <div className="flex items-start gap-2">
                {handle}
                <span className="display mt-0.5 w-5 shrink-0 text-center text-xs text-ink-600 tabular-nums">
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
                            className={`name transition-colors hover:text-played-300 ${
                              participant.isWinner ? "text-played-300" : ""
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
                      className="display mt-1 text-[10px] tracking-widest text-ink-600 hover:text-plan-300"
                    >
                      head to head ⇄
                    </button>
                  )}

                  {isFinalized && isMatch && (
                    <p className="display mt-2 text-xs tracking-wide text-played-300">
                      {winners.length ? `${winners.map((w) => w.name).join(" & ")} won` : "No decision"}
                    </p>
                  )}
                  {segment.resultNote && <p className="mt-1 text-xs text-ink-300">{segment.resultNote}</p>}
                  {segment.note && <p className="mt-1 text-xs text-ink-500 italic">{segment.note}</p>}
                </div>

                {!isFinalized && (
                  <button
                    type="button"
                    onClick={() => setEditing(editing === segment.id ? null : segment.id)}
                    className="display shrink-0 text-[10px] tracking-widest text-ink-500 hover:text-plan-300"
                  >
                    {editing === segment.id ? "Cancel" : "Edit"}
                  </button>
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
            </div>
          );
        }}
      />

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
