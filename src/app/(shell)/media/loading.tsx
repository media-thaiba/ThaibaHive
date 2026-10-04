import { Skeleton } from "@/components/ui/skeleton";

export default function MediaLoading() {
  return (
    <div className="flex-1 p-6 space-y-6" aria-busy="true" aria-label="Loading digital media assets">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-44 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-xl" />
        ))}
      </div>
    </div>
  );
}
