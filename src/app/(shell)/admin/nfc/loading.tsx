import { Skeleton } from "@/components/ui/skeleton";

export default function NfcLoading() {
  return (
    <div className="flex-1 p-6 space-y-6" aria-busy="true" aria-label="Loading NFC card management">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-52 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
