import { Skeleton } from "@/components/ui/skeleton";

export default function FinanceLoading() {
  return (
    <div className="flex-1 p-6 space-y-6" aria-busy="true" aria-label="Loading finance data">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}
