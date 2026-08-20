"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { PeekPayload, PeekTarget } from "./types";

// Rule from the spec: looking something up must be a glance, not a trip. This
// sheet opens *over* whatever you are doing. Nothing navigates, so a
// half-built card is never lost.

type PeekContextValue = {
  open: (target: PeekTarget) => void;
  close: () => void;
};

const PeekContext = createContext<PeekContextValue | null>(null);

export function usePeek() {
  const context = useContext(PeekContext);
  if (!context) throw new Error("usePeek must be used inside <PeekProvider>");
  return context;
}

function queryFor(target: PeekTarget): string {
  if (target.kind === "headToHead") return `kind=headToHead&a=${target.a}&b=${target.b}`;
  return `kind=${target.kind}&id=${target.id}`;
}

export function PeekProvider({ children }: { children: React.ReactNode }) {
  // A stack, so you can peek a wrestler, then their rival, then the belt, and
  // walk back out to where you started.
  const [stack, setStack] = useState<PeekTarget[]>([]);
  // Cached against the query it was fetched for, so stale content never shows
  // under a new heading while the next fetch is in flight.
  const [entry, setEntry] = useState<{ key: string; payload: PeekPayload } | null>(null);

  const target = stack[stack.length - 1] ?? null;
  const key = target ? queryFor(target) : null;
  const payload = entry && entry.key === key ? entry.payload : null;
  const loading = target !== null && payload === null;

  const open = useCallback((next: PeekTarget) => setStack((prev) => [...prev, next]), []);
  const close = useCallback(() => setStack([]), []);
  const back = useCallback(() => setStack((prev) => prev.slice(0, -1)), []);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/peek?${key}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: PeekPayload | null) => {
        if (data) setEntry({ key, payload: data });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [key]);

  useEffect(() => {
    if (!target) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, close]);

  return (
    <PeekContext.Provider value={{ open, close }}>
      {children}
      {target && (
        <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-stretch lg:justify-end">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          />
          <div className="relative flex max-h-[85dvh] w-full flex-col rounded-t-2xl border-t border-ink-700 bg-ink-900 shadow-2xl lg:max-h-none lg:h-dvh lg:w-[26rem] lg:rounded-none lg:border-t-0 lg:border-l">
            <div className="flex items-center gap-2 border-b border-ink-800 px-4 py-3">
              {stack.length > 1 && (
                <button type="button" onClick={back} className="text-sm text-ink-400 hover:text-ink-100">
                  ‹ Back
                </button>
              )}
              <span className="ml-auto text-[10px] font-semibold tracking-widest text-ink-500 uppercase">
                Quick look
              </span>
              <button type="button" onClick={close} className="text-sm text-ink-400 hover:text-ink-100">
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {loading && !payload && <p className="text-sm text-ink-500">Loading…</p>}
              {payload && <PeekBody payload={payload} open={open} close={close} />}
            </div>
          </div>
        </div>
      )}
    </PeekContext.Provider>
  );
}

function MatchLines({
  lines,
}: {
  lines: { segmentId: string; showName: string; date: string; line: string; outcome: string | null; detail: string | null }[];
}) {
  if (lines.length === 0) return <p className="text-sm text-ink-500">Nothing played yet.</p>;
  return (
    <ul className="space-y-2">
      {lines.map((line) => (
        <li key={line.segmentId} className="rounded-lg border border-ink-800 bg-ink-850 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-ink-100">{line.line}</span>
            {line.outcome && (
              <span
                className={`shrink-0 text-xs font-semibold ${
                  line.outcome === "Win" ? "text-played-300" : "text-ink-400"
                }`}
              >
                {line.outcome}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {line.showName} · {line.date}
          </p>
          {line.detail && <p className="mt-1 text-xs text-ink-400">{line.detail}</p>}
        </li>
      ))}
    </ul>
  );
}

function PeekBody({
  payload,
  open,
  close,
}: {
  payload: PeekPayload;
  open: (target: PeekTarget) => void;
  close: () => void;
}) {
  const heading = (
    <div className="mb-4">
      <h2 className="text-lg font-bold tracking-tight">{payload.title}</h2>
      {payload.subtitle && <p className="text-sm text-ink-400">{payload.subtitle}</p>}
    </div>
  );

  if (payload.kind === "wrestler") {
    return (
      <div>
        {heading}
        <div className="card mb-4 flex items-center justify-between p-3">
          <div>
            <p className="section-title">Record</p>
            <p className="text-2xl font-bold tabular-nums">{payload.record}</p>
          </div>
          <p className="text-xs text-ink-500">
            {payload.matches} played match{payload.matches === 1 ? "" : "es"}
          </p>
        </div>

        {payload.reigns.length > 0 && (
          <section className="mb-4">
            <p className="section-title mb-2">Currently holding</p>
            <ul className="space-y-1.5">
              {payload.reigns.map((reign) => (
                <li key={reign.id}>
                  <button
                    type="button"
                    onClick={() => open({ kind: "title", id: reign.titleId })}
                    className="w-full rounded-lg border border-played-500/30 bg-played-500/10 p-3 text-left"
                  >
                    <span className="text-sm font-semibold text-played-300">{reign.label}</span>
                    <span className="mt-0.5 block text-xs text-ink-400">{reign.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {payload.opponents.length > 0 && (
          <section className="mb-4">
            <p className="section-title mb-2">Most-faced</p>
            <ul className="space-y-1.5">
              {payload.opponents.map((opponent) => (
                <li key={opponent.id}>
                  <button
                    type="button"
                    onClick={() => open({ kind: "headToHead", a: payload.id, b: opponent.id })}
                    className="flex w-full items-center justify-between rounded-lg border border-ink-800 bg-ink-850 px-3 py-2 text-left"
                  >
                    <span className="text-sm">{opponent.name}</span>
                    <span className="text-xs text-ink-500">{opponent.summary}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <p className="section-title mb-2">Recent matches</p>
          <MatchLines lines={payload.recent} />
        </section>

        <Link href={payload.href} onClick={close} className="btn-ghost mt-4 w-full">
          Open full profile
        </Link>
      </div>
    );
  }

  if (payload.kind === "headToHead") {
    return (
      <div>
        {heading}
        <div className="card mb-4 p-3">
          <p className="section-title">Head to head</p>
          <p className="mt-1 text-sm font-semibold">{payload.summary}</p>
          {payload.titleMatches > 0 && (
            <p className="mt-1 text-xs text-played-300">
              {payload.titleMatches} with a title on the line
            </p>
          )}
        </div>
        <MatchLines lines={payload.recent} />
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => open({ kind: "wrestler", id: payload.aId })} className="btn-ghost">
            Left profile
          </button>
          <button type="button" onClick={() => open({ kind: "wrestler", id: payload.bId })} className="btn-ghost">
            Right profile
          </button>
        </div>
      </div>
    );
  }

  if (payload.kind === "title") {
    return (
      <div>
        {heading}
        <div className="card mb-4 border-played-500/30 bg-played-500/10 p-3">
          <p className="section-title">Current champion</p>
          <p className="mt-1 text-sm font-semibold text-played-300">{payload.current}</p>
        </div>
        <p className="section-title mb-2">Lineage</p>
        <ol className="space-y-1.5">
          {payload.reigns.map((reign) => (
            <li key={reign.id} className="rounded-lg border border-ink-800 bg-ink-850 p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">
                  <span className="mr-1.5 text-xs text-ink-500">#{reign.number}</span>
                  {reign.holders}
                </span>
                <span className="shrink-0 text-xs text-ink-400">{reign.length}</span>
              </div>
              <p className="mt-1 text-xs text-ink-500">{reign.span}</p>
            </li>
          ))}
          {payload.reigns.length === 0 && <p className="text-sm text-ink-500">No reigns yet.</p>}
        </ol>
        <Link href={payload.href} onClick={close} className="btn-ghost mt-4 w-full">
          Open full lineage
        </Link>
      </div>
    );
  }

  return (
    <div>
      {heading}
      <span className={payload.isFinalized ? "chip-played" : "chip-plan"}>
        {payload.isFinalized ? "Played" : "Booked"}
      </span>
      <ol className="mt-3 space-y-1.5">
        {payload.segments.map((segment, index) => (
          <li key={segment.id} className="rounded-lg border border-ink-800 bg-ink-850 p-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-ink-500 tabular-nums">{index + 1}</span>
              <span className="chip-muted">{segment.label}</span>
            </div>
            <p className="mt-1.5 text-sm">{segment.line}</p>
            {segment.outcome && <p className="mt-1 text-xs font-semibold text-played-300">{segment.outcome}</p>}
            {segment.detail && <p className="mt-1 text-xs text-ink-500">{segment.detail}</p>}
          </li>
        ))}
        {payload.segments.length === 0 && <p className="text-sm text-ink-500">Nothing booked yet.</p>}
      </ol>
      <Link href={payload.href} onClick={close} className="btn-ghost mt-4 w-full">
        Open show
      </Link>
    </div>
  );
}
