import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div className="flex-1 p-6 space-y-6" aria-busy="true" aria-label="Loading tasks">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-44 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    </div>
  );
}
