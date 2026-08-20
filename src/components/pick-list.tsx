"use client";

import { useState } from "react";

/**
 * The recurring pattern: a pick-list for the common cases, plus "other,
 * specify" so nothing creative is ever blocked. One interaction, learned once,
 * used everywhere a type is chosen.
 */
export function PickList({
  name,
  options,
  defaultValue,
  placeholder = "None",
  otherLabel = "Other, specify…",
}: {
  name: string;
  options: readonly string[];
  defaultValue?: string | null;
  placeholder?: string;
  otherLabel?: string;
}) {
  const initial = defaultValue ?? "";
  const isPreset = initial === "" || options.includes(initial);
  const [choice, setChoice] = useState(isPreset ? initial : "__other__");
  const [custom, setCustom] = useState(isPreset ? "" : initial);

  const value = choice === "__other__" ? custom : choice;

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value} />
      <select
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
        className="field"
        aria-label={name}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value="__other__">{otherLabel}</option>
      </select>
      {choice === "__other__" && (
        <input
          autoFocus
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Specify"
          className="field"
        />
      )}
    </div>
  );
}
