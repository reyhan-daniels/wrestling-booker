"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { RosterPicker, type PickableWrestler } from "@/components/roster-picker";
import { ColorPicker } from "@/components/color-picker";
import { unitKind } from "@/lib/constants";

type Group = {
  id: string;
  name: string;
  color: string | null;
  notes: string | null;
  isActive: boolean;
  memberIds: string[];
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
      {pending ? "Saving…" : label}
    </button>
  );
}

export function GroupForm({
  action,
  group,
  wrestlers,
  submitLabel,
}: {
  action: (data: FormData) => Promise<void>;
  group?: Group;
  wrestlers: PickableWrestler[];
  submitLabel: string;
}) {
  const [members, setMembers] = useState<string[]>(group?.memberIds ?? []);

  return (
    <form action={action} className="space-y-5">
      {group && <input type="hidden" name="id" value={group.id} />}

      <div className="card space-y-4 p-4">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required defaultValue={group?.name} className="field" />
        </div>
        <ColorPicker name="color" defaultValue={group?.color} label="Colour" />
      </div>

      <div className="card p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="section-title">Members</p>
          {/* The kind is never a field — it is just how many people are in it. */}
          <span className="display text-[10px] tracking-widest text-played-400">
            {unitKind(members.length)}
            {members.length > 0 && ` · ${members.length}`}
          </span>
        </div>
        <RosterPicker
          wrestlers={wrestlers}
          value={members}
          onChange={setMembers}
          name="memberIds"
        />
        <p className="mt-2 text-xs text-ink-500">
          Two is a tag team, three a trio, four or more a faction. Nobody is
          exclusive — the same wrestler can be in as many units as you like.
        </p>
      </div>

      <div className="card space-y-3 p-4">
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={3} defaultValue={group?.notes ?? ""} className="field" />
        </div>
        {group && (
          <label className="flex items-center gap-2 text-sm text-ink-400">
            <input
              type="checkbox"
              name="disbanded"
              defaultChecked={!group.isActive}
              className="size-4"
            />
            Disbanded
          </label>
        )}
      </div>

      <Submit label={submitLabel} />
    </form>
  );
}
