"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ALIGNMENT_LABELS, MAX_SIGNATURE_MOVES } from "@/lib/constants";

type Wrestler = {
  id: string;
  name: string;
  nickname: string | null;
  height: string | null;
  weight: string | null;
  align: string;
  status: string;
  signatureMoves: string[];
  notes: string | null;
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
      {pending ? "Saving…" : label}
    </button>
  );
}

export function WrestlerForm({
  action,
  wrestler,
  submitLabel,
}: {
  action: (data: FormData) => Promise<void>;
  wrestler?: Wrestler;
  submitLabel: string;
}) {
  // Signature moves are a collection, capped at five — never a comma-joined
  // string typed into one box.
  const [moves, setMoves] = useState<string[]>(
    wrestler?.signatureMoves.length ? wrestler.signatureMoves : [""],
  );

  return (
    <form action={action} className="space-y-5">
      {wrestler && <input type="hidden" name="id" value={wrestler.id} />}

      <div className="card space-y-4 p-4">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required defaultValue={wrestler?.name} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="nickname">Nickname</label>
          <input
            id="nickname"
            name="nickname"
            defaultValue={wrestler?.nickname ?? ""}
            placeholder="&ldquo;The Rated-R Superstar&rdquo;"
            className="field"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="height">Height</label>
            <input id="height" name="height" defaultValue={wrestler?.height ?? ""} placeholder="6'2&quot;" className="field" />
          </div>
          <div>
            <label className="label" htmlFor="weight">Weight</label>
            <input id="weight" name="weight" defaultValue={wrestler?.weight ?? ""} placeholder="245 lbs" className="field" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="align">Alignment</label>
            <select id="align" name="align" defaultValue={wrestler?.align ?? "TWEENER"} className="field">
              {Object.entries(ALIGNMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={wrestler?.status ?? "ACTIVE"} className="field">
              <option value="ACTIVE">Active</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card space-y-3 p-4">
        <p className="section-title">Signature moves</p>
        {moves.map((move, index) => (
          <div key={index} className="flex gap-2">
            <input
              name="signatureMoves"
              value={move}
              onChange={(event) => {
                const next = [...moves];
                next[index] = event.target.value;
                setMoves(next);
              }}
              placeholder={`Move ${index + 1}`}
              className="field"
            />
            <button
              type="button"
              onClick={() => setMoves(moves.filter((_, i) => i !== index))}
              className="btn-ghost px-3"
              aria-label="Remove move"
            >
              ×
            </button>
          </div>
        ))}
        {moves.length < MAX_SIGNATURE_MOVES && (
          <button type="button" onClick={() => setMoves([...moves, ""])} className="btn-ghost">
            + Add move
          </button>
        )}
        <p className="text-xs text-ink-500">Up to {MAX_SIGNATURE_MOVES}.</p>
      </div>

      <div className="card p-4">
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={wrestler?.notes ?? ""} className="field" />
      </div>

      <Submit label={submitLabel} />
    </form>
  );
}
