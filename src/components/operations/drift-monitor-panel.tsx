'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { useModelDrift } from '@/lib/hooks/use-model-drift';

export function DriftMonitorPanel() {
  const { driftReports, isLoading, error } = useModelDrift();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Continuous Drift Radar & Retraining Trigger Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {driftReports.map((report) => {
              const isDrifted = (report.overallPsi ?? 0) >= 0.25 || (report.maxFeatureKs ?? 0) >= 0.2;
              return (
                <div key={report.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Model: {report.modelId}</span>
                    <Badge variant={isDrifted ? 'warning' : 'success'}>
                      {isDrifted ? 'RETRAINING RECOMMENDED' : 'STABLE'}
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Overall PSI: {report.overallPsi?.toFixed(4) ?? '0.0000'} | Max KS: {report.maxFeatureKs?.toFixed(4) ?? '0.0000'}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
