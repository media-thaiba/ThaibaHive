import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const SwarmDashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="col-span-3 border rounded-xl p-6 space-y-4 bg-card h-[480px]">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-[380px] w-full" />
        </div>

        <div className="col-span-3 border rounded-xl p-6 space-y-4 bg-card h-[250px]">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-[120px] w-full" />
        </div>

        <div className="col-span-3 border rounded-xl p-6 space-y-4 bg-card h-[400px]">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </div>

        <div className="col-span-3 border rounded-xl p-6 space-y-4 bg-card h-[400px]">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-2">
            <div className="flex space-x-4 border-b pb-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex space-x-4 py-2 border-b">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
