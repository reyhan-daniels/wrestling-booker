"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { PickList } from "@/components/pick-list";
import { RosterPicker, type PickableWrestler } from "@/components/roster-picker";
import { SEGMENT_TYPES, SEGMENT_TYPE_LABELS, STIPULATIONS } from "@/lib/constants";

export type EditableSegment = {
  id: string;
  type: string;
  customType: string | null;
  note: string | null;
  isTitleMatch: boolean;
  titleId: string | null;
  tournamentId: string | null;
  isPlayoff: boolean;
  stipulation: string | null;
  participantIds: string[];
};

export type PickableTitle = { id: string; name: string; companyName: string };
export type PickableTournament = {
  id: string;
  name: string;
  /** A league that ends in a playoff — the only case with two kinds of match. */
  hasPlayoff: boolean;
  isBracket: boolean;
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * Booking is choosing participants — the plan. There is deliberately no winner
 * field anywhere on this form; winners only exist in Play.
 */
export function SegmentEditor({
  action,
  showId,
  wrestlers,
  titles,
  tournaments,
  segment,
  submitLabel,
  onDone,
}: {
  action: (data: FormData) => Promise<void>;
  showId: string;
  wrestlers: PickableWrestler[];
  titles: PickableTitle[];
  tournaments: PickableTournament[];
  segment?: EditableSegment;
  submitLabel: string;
  onDone?: () => void;
}) {
  const [type, setType] = useState(segment?.type ?? "MATCH");
  const [participants, setParticipants] = useState<string[]>(segment?.participantIds ?? []);
  const [isTitleMatch, setIsTitleMatch] = useState(segment?.isTitleMatch ?? false);
  const [tournamentId, setTournamentId] = useState(segment?.tournamentId ?? "");

  const tournament = tournaments.find((t) => t.id === tournamentId);

  const isMatch = type === "MATCH";

  async function submit(data: FormData) {
    await action(data);
    if (!segment) {
      // The add form clears itself so the next segment starts fresh.
      setType("MATCH");
      setParticipants([]);
      setIsTitleMatch(false);
    }
    onDone?.();
  }

  return (
    <form action={submit} className="space-y-4">
      {segment ? (
        <input type="hidden" name="id" value={segment.id} />
      ) : (
        <input type="hidden" name="showId" value={showId} />
      )}

      <div>
        <label className="label" htmlFor={`type-${segment?.id ?? "new"}`}>Segment type</label>
        <select
          id={`type-${segment?.id ?? "new"}`}
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="field"
        >
          {SEGMENT_TYPES.map((option) => (
            <option key={option} value={option}>
              {SEGMENT_TYPE_LABELS[option]}
            </option>
          ))}
        </select>
        {type === "OTHER" && (
          <input
            name="customType"
            defaultValue={segment?.customType ?? ""}
            placeholder="Specify segment type"
            className="field mt-2"
          />
        )}
      </div>

      <div>
        <span className="label">Participants</span>
        <RosterPicker wrestlers={wrestlers} value={participants} onChange={setParticipants} />
      </div>

      {isMatch && (
        <>
          <div>
            <span className="label">Stipulation</span>
            <PickList name="stipulation" options={STIPULATIONS} defaultValue={segment?.stipulation} placeholder="Standard match" />
          </div>

          {tournaments.length > 0 && (
            <div className="rounded-lg border border-plan-500/25 bg-plan-500/5 p-3">
              <label className="label" htmlFor={`tournament-${segment?.id ?? "new"}`}>
                Tournament
              </label>
              <select
                id={`tournament-${segment?.id ?? "new"}`}
                name="tournamentId"
                value={tournamentId}
                onChange={(event) => setTournamentId(event.target.value)}
                className="field"
              >
                <option value="">Not a tournament match</option>
                {tournaments.map((option) => (
                  <option key={option.id} value={option.id}>{option.name}</option>
                ))}
              </select>

              {/* Nothing is asked about the round: it is counted from the
                  matches already booked. The one thing the tool cannot work
                  out is whether a league match is a block match or the
                  playoff. */}
              {tournament?.hasPlayoff && (
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="isPlayoff"
                    defaultChecked={segment?.isPlayoff ?? false}
                    className="size-4"
                  />
                  Playoff match
                </label>
              )}
              {tournament && (
                <p className="mt-2 text-xs text-ink-500">
                  {tournament.isBracket
                    ? "The round is counted from the matches already booked — first round, then whoever comes through it."
                    : tournament.hasPlayoff
                      ? "A block match feeds the table. A playoff match does not."
                      : "This feeds the league table."}
                </p>
              )}
            </div>
          )}

          {titles.length > 0 && (
            <div className="rounded-lg border border-played-500/25 bg-played-500/5 p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isTitleMatch"
                  checked={isTitleMatch}
                  onChange={(event) => setIsTitleMatch(event.target.checked)}
                  className="size-4"
                />
                Title match
              </label>
              {isTitleMatch && (
                <select name="titleId" defaultValue={segment?.titleId ?? ""} required className="field mt-2">
                  <option value="">Choose a title…</option>
                  {titles.map((title) => (
                    <option key={title.id} value={title.id}>
                      {title.companyName} — {title.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </>
      )}

      <div>
        <label className="label" htmlFor={`note-${segment?.id ?? "new"}`}>
          What is this about?
        </label>
        <textarea
          id={`note-${segment?.id ?? "new"}`}
          name="note"
          rows={2}
          defaultValue={segment?.note ?? ""}
          placeholder="Blow-off to their three-month issue"
          className="field"
        />
      </div>

      <Submit label={submitLabel} />
    </form>
  );
}
