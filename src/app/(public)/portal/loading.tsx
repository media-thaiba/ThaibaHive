import { Skeleton } from "@/components/ui/skeleton";

export default function PublicPortalLoading() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8" aria-busy="true" aria-label="Loading campus portal">
      <div className="flex justify-between items-center border-b border-border pb-4">
        <Skeleton className="h-10 w-52 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    </div>
  );
}
