"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

export interface GovernanceData {
  totalPolicies: number;
  activePolicies: number;
  propagatingPolicies: number;
  conflictCount: number;
  lastPropagatedAt?: string;
}

export function ExecutiveGovernanceHealthCard({ data, loading }: { data?: GovernanceData; loading?: boolean }) {
  if (loading || !data) {
    return (
      <Card role="region" aria-label="Federated Governance loading skeleton">
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

  return (
    <Card
      role="region"
      aria-label={`Federated Governance Health: ${data.activePolicies} of ${data.totalPolicies} policies active, ${data.conflictCount} conflicts`}
      tabIndex={0}
      className="border-border/60 bg-card hover:shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          <span>Federated Governance</span>
        </CardTitle>
        <Badge variant={data.conflictCount > 0 ? "destructive" : "success"}>
          {data.conflictCount > 0 ? `${data.conflictCount} Conflict` : "100% Synced"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {data.activePolicies} / {data.totalPolicies}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Active Federated Policies Across 23 Campuses</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-muted/40 p-2 rounded-md">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <span className="text-muted-foreground">Propagating:</span>
            <span className="font-semibold text-foreground ml-auto">{data.propagatingPolicies}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/40 p-2 rounded-md">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            <span className="text-muted-foreground">Conflicts:</span>
            <span className="font-semibold text-foreground ml-auto">{data.conflictCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
