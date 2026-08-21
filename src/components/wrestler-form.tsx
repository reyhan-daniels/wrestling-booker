"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ALIGNMENT_LABELS, GENDER_LABELS } from "@/lib/constants";
import { PHOTO_ACCEPT, describePhotoLimit, validatePhoto } from "@/lib/photo";

type Wrestler = {
  id: string;
  name: string;
  nickname: string | null;
  height: string | null;
  weight: string | null;
  align: string;
  gender: string | null;
  status: string;
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
  companies = [],
  preselectedCompanyId,
}: {
  action: (data: FormData) => Promise<void>;
  wrestler?: Wrestler;
  submitLabel: string;
  /** Offered only while creating; an existing wrestler manages deals on their profile. */
  companies?: { id: string; name: string; abbreviation: string | null }[];
  preselectedCompanyId?: string;
}) {
  // A portrait rides along with the rest of the form, so it can be set at the
  // moment a wrestler is created rather than only after they exist.
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [dropExisting, setDropExisting] = useState(false);

  // Signing happens at the same moment as creating, rather than being a
  // second trip to the profile page.
  const [signedTo, setSignedTo] = useState<string[]>(
    preselectedCompanyId ? [preselectedCompanyId] : [],
  );
  const [primary, setPrimary] = useState<string | null>(preselectedCompanyId ?? null);

  function toggleCompany(companyId: string) {
    setSignedTo((current) => {
      const next = current.includes(companyId)
        ? current.filter((id) => id !== companyId)
        : [...current, companyId];
      setPrimary((was) => (next.includes(was ?? "") ? was : (next[0] ?? null)));
      return next;
    });
  }

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="align">Alignment</label>
            <select id="align" name="align" defaultValue={wrestler?.align ?? "TWEENER"} className="field">
              {Object.entries(ALIGNMENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="gender">Division</label>
            <select id="gender" name="gender" defaultValue={wrestler?.gender ?? ""} className="field">
              <option value="">Unset</option>
              {Object.entries(GENDER_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={wrestler?.status ?? "ACTIVE"} className="field">
              <option value="ACTIVE">Active</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
        </div>
      </div>

      {!wrestler && companies.length > 0 && (
        <div className="card p-4">
          <p className="section-title mb-3">Roster</p>
          <ul className="space-y-1.5">
            {companies.map((company) => {
              const signed = signedTo.includes(company.id);
              return (
                <li key={company.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-2.5 rounded-[3px] border px-3 py-2.5 text-sm transition-colors ${
                      signed ? "border-plan-500/60 bg-plan-500/10" : "border-ink-800 bg-ink-900"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="companyIds"
                      value={company.id}
                      checked={signed}
                      onChange={() => toggleCompany(company.id)}
                      className="size-4"
                    />
                    <span className="min-w-0 flex-1 truncate">{company.name}</span>
                    {signed && signedTo.length > 1 && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          setPrimary(company.id);
                        }}
                        className={primary === company.id ? "chip-plan" : "chip-muted"}
                      >
                        {primary === company.id ? "Primary" : "Make primary"}
                      </button>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
          {primary && <input type="hidden" name="primaryCompanyId" value={primary} />}
          <p className="mt-2 text-xs text-ink-500">
            Optional — an unsigned wrestler can still be booked on any card.
          </p>
        </div>
      )}

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

      <div className="card p-4">
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" rows={3} defaultValue={wrestler?.notes ?? ""} className="field" />
      </div>

      <Submit label={submitLabel} />
    </form>
  );
}
