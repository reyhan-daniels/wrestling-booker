"use client";

import { useMemo, useState } from "react";
import { usePeek } from "@/components/peek/peek-provider";

export type PickableWrestler = {
  id: string;
  name: string;
  companies: string[];
  isRetired: boolean;
};

/**
 * Participants are always picked by clicking a name, never typed. Every name in
 * the list also has a peek handle, so you can check a record without leaving
 * the half-built card.
 */
export function RosterPicker({
  wrestlers,
  value,
  onChange,
  name = "participantIds",
}: {
  wrestlers: PickableWrestler[];
  value: string[];
  onChange: (next: string[]) => void;
  name?: string;
}) {
  const [query, setQuery] = useState("");
  const [showRetired, setShowRetired] = useState(false);
  const { open } = usePeek();

  const byId = useMemo(() => new Map(wrestlers.map((w) => [w.id, w])), [wrestlers]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return wrestlers
      .filter((w) => (showRetired || !w.isRetired) && !value.includes(w.id))
      .filter((w) => (needle ? w.name.toLowerCase().includes(needle) : true))
      .slice(0, 40);
  }, [wrestlers, query, value, showRetired]);

  return (
    <div>
      {value.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {value.map((id, index) => {
            const wrestler = byId.get(id);
            return (
              <li
                key={id}
                className="flex items-center gap-1.5 rounded-full border border-plan-500/40 bg-plan-500/10 py-1 pr-1 pl-2.5"
              >
                <button
                  type="button"
                  onClick={() => open({ kind: "wrestler", id })}
                  className="text-sm text-plan-200"
                >
                  {wrestler?.name ?? "Unknown"}
                </button>
                {/* Two selected names are a head-to-head away from being useful. */}
                {index === 1 && value.length === 2 && (
                  <button
                    type="button"
                    title="Head to head"
                    onClick={() => open({ kind: "headToHead", a: value[0], b: value[1] })}
                    className="text-xs text-plan-300"
                  >
                    ⇄
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== id))}
                  aria-label={`Remove ${wrestler?.name ?? "wrestler"}`}
                  className="flex size-5 items-center justify-center rounded-full text-ink-400 hover:bg-ink-700 hover:text-ink-100"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search the roster"
        className="field"
      />

      <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-ink-800">
        {matches.length === 0 ? (
          <p className="p-3 text-sm text-ink-500">No matching wrestlers.</p>
        ) : (
          <ul className="divide-y divide-ink-800">
            {matches.map((wrestler) => (
              <li key={wrestler.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    onChange([...value, wrestler.id]);
                    setQuery("");
                  }}
                  className="min-w-0 flex-1 px-3 py-2.5 text-left hover:bg-ink-800"
                >
                  <span className="block truncate text-sm">{wrestler.name}</span>
                  {wrestler.companies.length > 0 && (
                    <span className="block truncate text-[11px] text-ink-500">
                      {wrestler.companies.join(" · ")}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => open({ kind: "wrestler", id: wrestler.id })}
                  className="px-3 py-2.5 text-[11px] text-ink-500 hover:text-plan-300"
                >
                  peek
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs text-ink-500">
        <input
          type="checkbox"
          checked={showRetired}
          onChange={(event) => setShowRetired(event.target.checked)}
          className="size-3.5"
        />
        Include retired
      </label>
    </div>
  );
}
