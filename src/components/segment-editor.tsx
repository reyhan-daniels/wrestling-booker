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
  tournamentRound: number | null;
  stipulation: string | null;
  participantIds: string[];
};

export type PickableTitle = { id: string; name: string; companyName: string };
export type PickableTournament = {
  id: string;
  name: string;
  /** A bracket, or a league with a playoff — either way, rounds mean something. */
  usesRounds: boolean;
  isLeague: boolean;
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

              {/* The round is what makes a match a playoff match rather than a
                  block match, so a league with a playoff needs it too. */}
              {tournament?.usesRounds && (
                <div className="mt-2">
                  <label className="label" htmlFor={`round-${segment?.id ?? "new"}`}>
                    {tournament.isLeague ? "Stage" : "Round"}
                  </label>
                  {tournament.isLeague ? (
                    <select
                      id={`round-${segment?.id ?? "new"}`}
                      name="tournamentRound"
                      defaultValue={String(segment?.tournamentRound ?? "")}
                      className="field"
                    >
                      <option value="">Block match</option>
                      {[1, 2, 3].map((round) => (
                        <option key={round} value={round}>Playoff round {round}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={`round-${segment?.id ?? "new"}`}
                      type="number"
                      name="tournamentRound"
                      min={1}
                      defaultValue={segment?.tournamentRound ?? 1}
                      className="field"
                    />
                  )}
                  <p className="mt-1 text-xs text-ink-500">
                    {tournament.isLeague
                      ? "A block match feeds the table. A playoff match does not."
                      : "1 is the first round. The bracket names itself from how deep it goes."}
                  </p>
                </div>
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
