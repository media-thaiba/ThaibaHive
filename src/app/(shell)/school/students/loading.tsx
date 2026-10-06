import { Skeleton } from "@/components/ui/skeleton";

export default function StudentsLoading() {
  return (
    <div role="status" aria-label="Loading student records" className="flex-1 p-6 space-y-6" aria-busy="true">
      <span className="sr-only">Loading student records&hellip;</span>
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
