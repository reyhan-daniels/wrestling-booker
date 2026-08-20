"use client";

import { usePeek } from "./peek-provider";

/** Tap a wrestler's name anywhere in the app and their record comes to you. */
export function PeekName({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { open } = usePeek();
  return (
    <button
      type="button"
      onClick={() => open({ kind: "wrestler", id })}
      className={`text-left transition-colors hover:text-played-300 ${className}`}
    >
      {children}
    </button>
  );
}

export function PeekTitleBelt({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { open } = usePeek();
  return (
    <button
      type="button"
      onClick={() => open({ kind: "title", id })}
      className={`text-left transition-colors hover:text-played-300 ${className}`}
    >
      {children}
    </button>
  );
}

export function PeekShowButton({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { open } = usePeek();
  return (
    <button type="button" onClick={() => open({ kind: "show", id })} className={className}>
      {children}
    </button>
  );
}

export function PeekHeadToHead({
  a,
  b,
  children,
  className = "",
}: {
  a: string;
  b: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { open } = usePeek();
  return (
    <button type="button" onClick={() => open({ kind: "headToHead", a, b })} className={className}>
      {children}
    </button>
  );
}
