"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PhotoUpload({
  wrestlerId,
  hasPhoto,
  name,
}: {
  wrestlerId: string;
  hasPhoto: boolean;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bust the browser cache after a replacement without changing the URL shape.
  const [version, setVersion] = useState(0);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("photo", file);
    const response = await fetch(`/api/wrestlers/${wrestlerId}/photo`, { method: "POST", body });
    setBusy(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Upload failed.");
      return;
    }
    setVersion((v) => v + 1);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    await fetch(`/api/wrestlers/${wrestlerId}/photo`, { method: "DELETE" });
    setBusy(false);
    setVersion((v) => v + 1);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-3 aspect-square w-full overflow-hidden rounded-lg border border-ink-700 bg-ink-900">
        {hasPhoto || version > 0 ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`/api/wrestlers/${wrestlerId}/photo?v=${version}`}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-600">No photo</div>
        )}
      </div>

      <div className="flex gap-2">
        <label className="btn-ghost flex-1 cursor-pointer">
          {busy ? "Working…" : hasPhoto ? "Replace" : "Add photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </label>
        {hasPhoto && (
          <button type="button" onClick={remove} disabled={busy} className="btn-ghost">
            Remove
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-danger-400">{error}</p>}
    </div>
  );
}
