import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl">
      <Skeleton className="mb-3 h-4 w-20" />
      <Skeleton className="mb-5 h-7 w-56" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full lg:col-span-2" />
      </div>
    </div>
  );
}
