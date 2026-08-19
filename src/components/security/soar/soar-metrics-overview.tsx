'use client';

/**
 * SOAR Metrics Overview Cards
 * Sprint-040 — Metrics Radar
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface SoarMetricsOverviewProps {
  metrics: {
    totalExecutions: number;
    totalActions: number;
    pendingApprovals: number;
    totalCompensations: number;
    avgExecutionDurationSeconds: number;
    engineEnabled: boolean;
  };
  loading?: boolean;
}

export function SoarMetricsOverview({ metrics, loading }: SoarMetricsOverviewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Executions</CardTitle>
          <Badge variant="info">All-time</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalExecutions}</div>
          <p className="text-xs text-muted-foreground mt-1">Autonomous & manual runs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
          <Badge variant={metrics.pendingApprovals > 0 ? 'warning' : 'success'}>
            {metrics.pendingApprovals > 0 ? 'Action Required' : 'Clear'}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.pendingApprovals}</div>
          <p className="text-xs text-muted-foreground mt-1">Human-in-the-loop review</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Compensations</CardTitle>
          <Badge variant={metrics.totalCompensations > 0 ? 'secondary' : 'success'}>SAGA</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalCompensations}</div>
          <p className="text-xs text-muted-foreground mt-1">Automated reverse rollbacks</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response MTTR</CardTitle>
          <Badge variant="info">&lt; 30s SLA</Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.avgExecutionDurationSeconds.toFixed(2)}s</div>
          <p className="text-xs text-muted-foreground mt-1">From trigger to containment</p>
        </CardContent>
      </Card>
    </div>
  );
}
