"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Smartphone, RefreshCw, CheckCircle } from "lucide-react";

export interface MobileSyncData {
  pendingRecords: number;
  failedSyncs: number;
  activeMobileDevices: number;
  lastSyncAt?: string;
  syncHealth: string;
}

export function ExecutiveMobileSyncTile({ data, loading }: { data?: MobileSyncData; loading?: boolean }) {
  if (loading || !data) {
    return (
      <Card role="region" aria-label="Mobile Sync Health loading skeleton">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isHealthy = data.pendingRecords === 0 && data.failedSyncs === 0;

  return (
    <Card
      role="region"
      aria-label={`Mobile Sync Health: ${data.activeMobileDevices} active companion devices, ${data.pendingRecords} pending queued records, ${data.failedSyncs} sync failures`}
      tabIndex={0}
      className="border-border/60 bg-card hover:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Mobile Sync Health</span>
        </CardTitle>
        <Badge variant={isHealthy ? "success" : "warning"}>
          {isHealthy ? "100% Synced" : `${data.pendingRecords} Pending`}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-2xl font-bold tracking-tight text-foreground">{data.activeMobileDevices}</div>
          <p className="text-xs text-muted-foreground mt-0.5">Active Certified Companion App Devices</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-muted/40 p-2 rounded-md">
            <RefreshCw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <span className="text-muted-foreground">Outbox:</span>
            <span className="font-semibold text-foreground ml-auto">{data.pendingRecords} queued</span>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/40 p-2 rounded-md">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <span className="text-muted-foreground">Failures:</span>
            <span className="font-semibold text-foreground ml-auto">{data.failedSyncs}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
