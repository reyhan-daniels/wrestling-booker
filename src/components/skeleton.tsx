/**
 * Every page in this app is server-rendered on demand, so a navigation waits
 * on a database round trip. These stand in immediately so a tap feels like it
 * did something, instead of the screen sitting still.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-ink-800 ${className}`} />;
}

export function ListSkeleton({ rows = 6, columns = 1 }: { rows?: number; columns?: number }) {
  return (
    <div>
      <Skeleton className="mb-5 h-7 w-40" />
      <div className={columns > 1 ? "grid gap-2 md:grid-cols-2 xl:grid-cols-3" : "space-y-2"}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="card p-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
