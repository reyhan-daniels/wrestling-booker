import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-ink-800 pb-4">
      <div className="min-w-0 rule border-played-500">
        <h1 className="name-lg truncate">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[3px] border border-dashed border-ink-700 p-8 text-center text-sm text-ink-500">
      {children}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="display mb-3 inline-block text-[11px] tracking-widest text-ink-500 hover:text-ink-200"
    >
      ‹ {children}
    </Link>
  );
}

/** Distinguishes an editable plan from locked history at a glance. */
export function StateChip({ isFinalized }: { isFinalized: boolean }) {
  return (
    <span className={isFinalized ? "chip-played" : "chip-plan"}>
      {isFinalized ? "Played" : "Booked"}
    </span>
  );
}

/**
 * React 19 resets a form after its action runs, and a reset restores the
 * fields to the defaults they were *mounted* with — so an in-place edit form
 * that stays on screen snaps back to the old values even though the save
 * succeeded. Keying the form on the record's updatedAt remounts it with the
 * saved values as the new defaults. Only needed where the form survives the
 * save; create forms want the reset.
 */
export function editKey(record: { updatedAt: Date }): string {
  return record.updatedAt.toISOString();
}
