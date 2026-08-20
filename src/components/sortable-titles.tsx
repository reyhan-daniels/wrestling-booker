"use client";

import Link from "next/link";
import { useTransition } from "react";
import { SortableList } from "@/components/sortable-list";
import { reorderTitles } from "@/lib/actions/companies";

export type SortableTitle = {
  id: string;
  name: string;
  isActive: boolean;
  champion: string | null;
  detail: string | null;
};

/** A promotion's belts, ordered by hand: world title first, then the rest. */
export function SortableTitles({ companyId, titles }: { companyId: string; titles: SortableTitle[] }) {
  const [pending, startTransition] = useTransition();

  function save(ids: string[]) {
    const data = new FormData();
    data.set("companyId", companyId);
    for (const id of ids) data.append("ids", id);
    startTransition(async () => {
      await reorderTitles(data);
    });
  }

  return (
    <div className={pending ? "opacity-70 transition-opacity" : undefined}>
      <SortableList
        items={titles}
        onReorder={save}
        renderItem={(title, handle) => (
          <div className="flex items-stretch gap-1 rounded-[3px] border border-ink-800 border-l-2 border-l-played-500/60 bg-ink-900 p-2.5">
            {handle}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/titles/${title.id}`} className="min-w-0">
                  <span className="name block truncate text-played-200">{title.name}</span>
                </Link>
                {!title.isActive && <span className="chip-muted shrink-0">Retired</span>}
              </div>
              <p className="mt-0.5 truncate text-[11px] text-ink-500">
                {title.champion ?? "Vacant"}
                {title.detail ? ` · ${title.detail}` : ""}
              </p>
            </div>
          </div>
        )}
      />
    </div>
  );
}
