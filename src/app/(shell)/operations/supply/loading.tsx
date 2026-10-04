import { Skeleton } from "@/components/ui/skeleton";

export default function SupplyLoading() {
  return (
    <div role="status" aria-label="Loading supply chain" className="flex-1 p-6 space-y-6" aria-busy="true">
      <span className="sr-only">Loading supply chain and procurement&hellip;</span>
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-52 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
