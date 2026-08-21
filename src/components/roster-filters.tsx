"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { ALIGNMENT_LABELS, GENDER_LABELS } from "@/lib/constants";

export type RosterFilterValues = {
  q: string;
  company: string;
  align: string;
  gender: string;
  status: string;
  unit: string;
};

/**
 * Filters live in the URL, not in state: a filtered roster is a link you can
 * keep, and the page stays a server component behind it.
 */
export function RosterFilters({
  values,
  companies,
  units,
  showing,
  total,
}: {
  values: RosterFilterValues;
  companies: { id: string; name: string; abbreviation: string | null }[];
  units: { id: string; name: string }[];
  showing: number;
  total: number;
}) {
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const active =
    values.company !== "" ||
    values.align !== "" ||
    values.gender !== "" ||
    values.unit !== "" ||
    values.status !== "" ||
    values.q !== "";

  return (
    <form
      ref={form}
      action="/roster"
      className="card mb-4 flex flex-wrap items-center gap-2 p-2.5"
      onChange={() => form.current?.requestSubmit()}
    >
      <input
        name="q"
        type="search"
        defaultValue={values.q}
        placeholder="Search names"
        className="field h-9 min-w-0 flex-1 basis-44 py-1 text-sm"
        // A search box that submitted on every keystroke would fight the typist.
        onChange={(event) => event.stopPropagation()}
      />

      <Select name="company" value={values.company} label="All promotions">
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.abbreviation ?? company.name}
          </option>
        ))}
        <option value="none">Free agents</option>
      </Select>

      <Select name="align" value={values.align} label="Any alignment">
        {Object.entries(ALIGNMENT_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </Select>

      <Select name="gender" value={values.gender} label="Any division">
        {Object.entries(GENDER_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
        <option value="unset">Unset</option>
      </Select>

      {units.length > 0 && (
        <Select name="unit" value={values.unit} label="Any unit">
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>{unit.name}</option>
          ))}
          <option value="none">Unaffiliated</option>
        </Select>
      )}

      <Select name="status" value={values.status} label="Active only">
        <option value="all">Include retired</option>
        <option value="RETIRED">Retired only</option>
      </Select>

      <button type="submit" className="btn-ghost h-9 px-3 py-0 text-xs">
        Apply
      </button>

      <span className="display ml-auto shrink-0 px-1 text-[10px] tracking-widest text-ink-500">
        {showing === total ? `${total}` : `${showing} of ${total}`}
      </span>

      {active && (
        <button
          type="button"
          onClick={() => router.push("/roster")}
          className="display shrink-0 text-[10px] tracking-widest text-ink-500 hover:text-danger-400"
        >
          Clear
        </button>
      )}
    </form>
  );
}

function Select({
  name,
  value,
  label,
  children,
}: {
  name: string;
  value: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select
      name={name}
      defaultValue={value}
      aria-label={label}
      className={`field h-9 w-auto shrink-0 py-1 text-sm ${value ? "border-plan-500/60 text-plan-200" : ""}`}
    >
      <option value="">{label}</option>
      {children}
    </select>
  );
}
