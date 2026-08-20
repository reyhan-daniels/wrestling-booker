"use client";

import Link from "next/link";
import { openSeriesSlot } from "@/lib/actions/shows";

export type GridEntry = {
  kind: "show" | "slot";
  id: string;
  iso: string;
  name: string;
  companies: { id: string; name: string; color: string | null }[];
  isFinalized: boolean;
  seriesId: string | null;
  segmentCount: number;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * A month laid out as a month: seven columns, weeks as rows. Desktop only —
 * the agenda list stays on phones, where a 7-column grid is unreadable.
 */
export function MonthGrid({
  monthISO,
  today,
  entries,
}: {
  /** First day of the month being shown, as YYYY-MM-DD. */
  monthISO: string;
  today: string;
  entries: GridEntry[];
}) {
  const first = new Date(`${monthISO}T00:00:00.000Z`);
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // Monday-first offset for the 1st of the month.
  const leading = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const cells = Math.ceil((leading + daysInMonth) / 7) * 7;

  const byDay = new Map<string, GridEntry[]>();
  for (const entry of entries) {
    const list = byDay.get(entry.iso) ?? [];
    list.push(entry);
    byDay.set(entry.iso, list);
  }

  return (
    <div className="hidden lg:block">
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-ink-700 bg-ink-700">
        {WEEKDAYS.map((day) => (
          <div key={day} className="bg-ink-900 py-2 text-center text-[11px] font-semibold tracking-widest text-ink-500 uppercase">
            {day}
          </div>
        ))}

        {Array.from({ length: cells }, (_, index) => {
          const dayNumber = index - leading + 1;
          const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
          const iso = inMonth
            ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`
            : null;
          const dayEntries = iso ? byDay.get(iso) ?? [] : [];
          const isToday = iso === today;

          return (
            <div
              key={index}
              className={`min-h-28 bg-ink-850 p-1.5 ${inMonth ? "" : "opacity-40"} ${
                isToday ? "ring-1 ring-inset ring-plan-500/60" : ""
              }`}
            >
              {inMonth && (
                <div className={`mb-1 text-right text-xs tabular-nums ${isToday ? "font-bold text-plan-300" : "text-ink-500"}`}>
                  {dayNumber}
                </div>
              )}

              <div className="space-y-1">
                {dayEntries.map((entry) =>
                  entry.kind === "show" ? (
                    <Link
                      key={entry.id}
                      href={`/shows/${entry.id}`}
                      title={`${entry.name} — ${entry.companies.map((c) => c.name).join(" × ")}`}
                      className={`block truncate rounded px-1.5 py-1 text-[11px] leading-tight ${
                        entry.isFinalized
                          ? "bg-played-500/15 text-played-300 hover:bg-played-500/25"
                          : "bg-plan-500/15 text-plan-200 hover:bg-plan-500/25"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="mr-1 inline-block size-1.5 rounded-full align-middle"
                        style={{ background: entry.companies[0]?.color ?? "currentColor" }}
                      />
                      {entry.name}
                    </Link>
                  ) : (
                    <form action={openSeriesSlot} key={entry.id}>
                      <input type="hidden" name="seriesId" value={entry.seriesId ?? ""} />
                      <input type="hidden" name="date" value={entry.iso} />
                      <button
                        type="submit"
                        title={`Book ${entry.name}`}
                        className="block w-full truncate rounded border border-dashed border-ink-600 px-1.5 py-1 text-left text-[11px] leading-tight text-ink-500 hover:border-plan-500/60 hover:text-plan-300"
                      >
                        {entry.name}
                      </button>
                    </form>
                  ),
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
