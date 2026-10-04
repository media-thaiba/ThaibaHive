import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="flex-1 p-6 space-y-6" aria-busy="true" aria-label="Loading admin management console">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-60 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
