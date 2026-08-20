'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Truck, Navigation, AlertCircle } from 'lucide-react';

interface FleetLogisticsMapCardProps {
  dispatches: any[];
  activeCount: number;
  isLoading: boolean;
  onDispatchTrigger?: () => void;
}

export function FleetLogisticsMapCard({
  dispatches,
  activeCount,
  isLoading,
  onDispatchTrigger,
}: FleetLogisticsMapCardProps) {
  if (isLoading) {
    return (
      <Card className="border-slate-800 bg-slate-950/60 shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-950/60 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center space-x-2">
          <Truck className="h-5 w-5 text-indigo-400" />
          <CardTitle className="text-base font-semibold text-slate-100">
            Autonomous Fleet & Route Logistics
          </CardTitle>
        </div>
        <Badge variant={activeCount > 0 ? 'info' : 'secondary'}>
          {activeCount} Active Dispatches
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4 pt-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Dynamic Multi-Stop Routes</span>
            {onDispatchTrigger && (
              <Button size="sm" variant="outline" onClick={onDispatchTrigger} className="h-7 text-xs">
                New Dispatch
              </Button>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            CVRPTW routing algorithms minimizing transit distances and idle battery drain.
          </div>
        </div>

        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
          {dispatches.length === 0 ? (
            <div className="rounded border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
              No active vehicle dispatches at this moment.
            </div>
          ) : (
            dispatches.map((disp, idx) => (
              <div
                key={disp.routeId || idx}
                className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/30 p-2 text-xs"
              >
                <div className="flex items-center space-x-2">
                  <Navigation className="h-4 w-4 text-indigo-400" />
                  <div>
                    <div className="font-medium text-slate-200">{disp.vehicleId}</div>
                    <div className="text-[10px] text-slate-400">
                      {disp.totalDistanceKm} km · {disp.totalDurationMinutes} mins · {disp.projectedCo2EmissionsKg} kg CO2
                    </div>
                  </div>
                </div>
                <Badge variant={disp.status === 'ACTIVE' ? 'success' : 'secondary'} className="text-[10px]">
                  {disp.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
