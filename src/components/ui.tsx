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
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight lg:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-400">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="card border-dashed p-6 text-center text-sm text-ink-500">{children}</div>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-block text-sm text-ink-400 hover:text-ink-100">
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
