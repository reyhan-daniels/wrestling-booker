"use client";

import { useState } from "react";

/** A short palette that reads well as a calendar strip on a dark background,
 *  plus a free colour well for anything else. */
const SWATCHES = [
  "#dc2626", "#ea580c", "#d97706", "#65a30d",
  "#059669", "#0891b2", "#2563eb", "#7c3aed",
  "#c026d3", "#e11d48", "#78716c", "#94a3b8",
];

export function ColorPicker({
  name,
  defaultValue,
  label = "Colour",
}: {
  name: string;
  defaultValue?: string | null;
  label?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setValue("")}
          title="No colour — inherit"
          className={`size-7 rounded-[2px] border text-[10px] text-ink-500 ${
            value === "" ? "border-ink-300" : "border-ink-700"
          }`}
        >
          ✕
        </button>
        {SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            onClick={() => setValue(swatch)}
            title={swatch}
            style={{ background: swatch }}
            className={`size-7 rounded-[2px] border-2 ${
              value.toLowerCase() === swatch ? "border-ink-100" : "border-transparent"
            }`}
          />
        ))}
        <label className="ml-1 flex size-7 cursor-pointer items-center justify-center rounded-[2px] border border-ink-700 text-[10px] text-ink-400">
          <span aria-hidden>＋</span>
          <input
            type="color"
            value={value || "#2563eb"}
            onChange={(event) => setValue(event.target.value)}
            className="sr-only"
          />
        </label>
      </div>
    </div>
  );
}
