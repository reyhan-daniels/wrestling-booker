"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ColorPicker } from "@/components/color-picker";
import { TOURNAMENT_FORMAT_LABELS } from "@/lib/constants";

export type Contender = {
  /** "w:<id>" for a wrestler, "g:<id>" for a unit. */
  ref: string;
  name: string;
  detail: string;
  isUnit: boolean;
};

type Tournament = {
  id: string;
  name: string;
  format: string;
  companyId: string | null;
  color: string | null;
  notes: string | null;
  pointsWin: number;
  pointsDraw: number;
  startsOn: string;
  endsOn: string;
  isComplete: boolean;
  /** Same encoding as Contender.ref, with an optional "@block" suffix. */
  entrants: string[];
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
      {pending ? "Saving…" : label}
    </button>
  );
}

export function TournamentForm({
  action,
  tournament,
  contenders,
  companies,
  submitLabel,
}: {
  action: (data: FormData) => Promise<void>;
  tournament?: Tournament;
  contenders: Contender[];
  companies: { id: string; name: string }[];
  submitLabel: string;
}) {
  const [format, setFormat] = useState(tournament?.format ?? "ROUND_ROBIN");
  const [entrants, setEntrants] = useState<{ ref: string; block: string }[]>(
    tournament?.entrants.map((raw) => {
      const [ref, block] = raw.split("@");
      return { ref, block: block ?? "" };
    }) ?? [],
  );
  const [query, setQuery] = useState("");

  const isLeague = format === "ROUND_ROBIN";
  const byRef = new Map(contenders.map((c) => [c.ref, c]));
  const chosen = new Set(entrants.map((e) => e.ref));

  const matches = contenders
    .filter((c) => !chosen.has(c.ref))
    .filter((c) => (query ? c.name.toLowerCase().includes(query.trim().toLowerCase()) : true))
    .slice(0, 40);

  // Blocks in use, so the buttons offered are the ones already in play plus one.
  const blocks = [...new Set(entrants.map((e) => e.block).filter(Boolean))].sort();
  const nextBlock = String.fromCharCode(65 + blocks.length);

  function setBlock(ref: string, block: string) {
    setEntrants((current) => current.map((e) => (e.ref === ref ? { ...e, block } : e)));
  }

  return (
    <form action={action} className="space-y-5">
      {tournament && <input type="hidden" name="id" value={tournament.id} />}

      <div className="card space-y-4 p-4">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            required
            defaultValue={tournament?.name}
            placeholder="G1 Climax"
            className="field"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="format">Format</label>
            <select
              id="format"
              name="format"
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              className="field"
            >
              {Object.entries(TOURNAMENT_FORMAT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="companyId">Promotion</label>
            <select id="companyId" name="companyId" defaultValue={tournament?.companyId ?? ""} className="field">
              <option value="">Nobody in particular</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="startsOn">Starts</label>
            <input id="startsOn" type="date" name="startsOn" defaultValue={tournament?.startsOn} className="field" />
          </div>
          <div>
            <label className="label" htmlFor="endsOn">Ends</label>
            <input id="endsOn" type="date" name="endsOn" defaultValue={tournament?.endsOn} className="field" />
          </div>
        </div>

        {isLeague && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="pointsWin">Points for a win</label>
              <input
                id="pointsWin"
                type="number"
                name="pointsWin"
                min={0}
                defaultValue={tournament?.pointsWin ?? 2}
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="pointsDraw">Points for a draw</label>
              <input
                id="pointsDraw"
                type="number"
                name="pointsDraw"
                min={0}
                defaultValue={tournament?.pointsDraw ?? 1}
                className="field"
              />
            </div>
          </div>
        )}

        <ColorPicker name="color" defaultValue={tournament?.color} label="Colour" />
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="section-title">The field</p>
          <span className="display text-[10px] tracking-widest text-played-400">
            {entrants.length} entrant{entrants.length === 1 ? "" : "s"}
          </span>
        </div>

        {entrants.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {entrants.map((entrant) => {
              const contender = byRef.get(entrant.ref);
              return (
                <li
                  key={entrant.ref}
                  className="flex items-center gap-2 rounded-[3px] border border-ink-800 bg-ink-900 px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {contender?.name ?? "Gone from the roster"}
                    {contender?.isUnit && <span className="ml-1.5 chip-muted">Unit</span>}
                  </span>

                  {isLeague && (
                    <span className="flex shrink-0 gap-1">
                      {[...blocks, nextBlock].map((block) => (
                        <button
                          key={block}
                          type="button"
                          onClick={() => setBlock(entrant.ref, entrant.block === block ? "" : block)}
                          className={entrant.block === block ? "chip-plan" : "chip-muted"}
                        >
                          {block}
                        </button>
                      ))}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setEntrants((c) => c.filter((e) => e.ref !== entrant.ref))}
                    className="shrink-0 px-1 text-ink-600 hover:text-danger-400"
                    aria-label={`Remove ${contender?.name ?? "entrant"}`}
                  >
                    ×
                  </button>
                  <input
                    type="hidden"
                    name="entrants"
                    value={entrant.block ? `${entrant.ref}@${entrant.block}` : entrant.ref}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Add a wrestler or a unit"
          className="field"
        />
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {matches.map((contender) => (
            <li key={contender.ref}>
              <button
                type="button"
                onClick={() => setEntrants((c) => [...c, { ref: contender.ref, block: "" }])}
                className="rounded-[3px] border border-ink-800 bg-ink-900 px-2.5 py-1.5 text-sm hover:border-plan-500/60 hover:text-plan-200"
              >
                {contender.name}
                <span className="ml-1.5 text-[10px] text-ink-600">{contender.detail}</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs text-ink-500">
          {isLeague
            ? "Tag the field into blocks if you want two tables, the way the G1 runs. Leave them untagged for one."
            : "Order does not matter — the bracket is read off the matches you book, round by round."}
        </p>
      </div>

      <div className="card space-y-3 p-4">
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={3} defaultValue={tournament?.notes ?? ""} className="field" />
        </div>
        {tournament && (
          <label className="flex items-center gap-2 text-sm text-ink-400">
            <input type="checkbox" name="isComplete" defaultChecked={tournament.isComplete} className="size-4" />
            Concluded
          </label>
        )}
      </div>

      <Submit label={submitLabel} />
    </form>
  );
}
