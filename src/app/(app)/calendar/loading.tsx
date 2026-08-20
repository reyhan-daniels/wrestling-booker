import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-5 h-7 w-40" />
      <Skeleton className="mb-4 h-9 w-full" />
      <Skeleton className="hidden h-[32rem] w-full lg:block" />
      <div className="space-y-2 lg:hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
