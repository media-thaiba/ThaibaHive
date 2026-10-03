import { Skeleton } from "@/components/ui/skeleton";

export default function MediaLoading() {
  return (
    <div role="status" aria-label="Loading media library" className="flex-1 p-6 space-y-6">
      <span className="sr-only">Loading media library&hellip;</span>
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}