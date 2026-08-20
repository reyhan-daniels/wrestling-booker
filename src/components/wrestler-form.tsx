"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ALIGNMENT_LABELS, MAX_SIGNATURE_MOVES } from "@/lib/constants";
import { PHOTO_ACCEPT, describePhotoLimit, validatePhoto } from "@/lib/photo";

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
  hasPhoto?: boolean;
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

  // A portrait rides along with the rest of the form, so it can be set at the
  // moment a wrestler is created rather than only after they exist.
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [dropExisting, setDropExisting] = useState(false);

  // Object URLs are only freed when we let go of them.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const existingPhoto =
    wrestler?.hasPhoto && !dropExisting ? `/api/wrestlers/${wrestler.id}/photo` : null;
  const shown = preview ?? existingPhoto;

  function chooseFile(file: File | null) {
    setPhotoError(null);
    if (preview) URL.revokeObjectURL(preview);

    if (!file) {
      setPreview(null);
      return;
    }
    const problem = validatePhoto(file);
    if (problem) {
      setPreview(null);
      setPhotoError(problem);
      return;
    }
    setPreview(URL.createObjectURL(file));
    setDropExisting(false);
  }

  return (
    <form action={action} encType="multipart/form-data" className="space-y-5">
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

      <div className="card p-4">
        <p className="section-title mb-3">Photo</p>
        <div className="flex items-start gap-4">
          <div className="size-24 shrink-0 overflow-hidden rounded-lg border border-ink-700 bg-ink-900">
            {shown ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={shown} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[11px] text-ink-600">
                No photo
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <label className="btn-ghost cursor-pointer">
              {shown ? "Choose a different image" : "Choose an image"}
              <input
                type="file"
                name="photo"
                accept={PHOTO_ACCEPT}
                className="hidden"
                onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <p className="mt-2 text-xs text-ink-500">{describePhotoLimit()}</p>
            {photoError && <p className="mt-1 text-xs text-danger-400">{photoError}</p>}

            {wrestler?.hasPhoto && (
              <label className="mt-3 flex items-center gap-2 text-xs text-ink-400">
                <input
                  type="checkbox"
                  name="removePhoto"
                  checked={dropExisting}
                  onChange={(event) => {
                    setDropExisting(event.target.checked);
                    if (event.target.checked) chooseFile(null);
                  }}
                  className="size-3.5"
                />
                Remove the current photo
              </label>
            )}
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
