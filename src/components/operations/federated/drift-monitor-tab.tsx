'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { useModelDrift } from '@/lib/hooks/use-model-drift';

export function DriftMonitorTab() {
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Statistical Drift & Covariate Shift Radar</h3>
        <p className="text-sm text-muted-foreground">
          Kolmogorov-Smirnov (KS) test, Population Stability Index (PSI), and Wasserstein distance metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {driftReports.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              No drift evaluations recorded yet. All models currently within baseline distributions.
            </CardContent>
          </Card>
        ) : (
          driftReports.map((report) => (
            <Card key={report.id} className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">{report.modelId}</CardTitle>
                <Badge variant={report.hasSignificantDrift ? 'destructive' : 'success'}>
                  {report.hasSignificantDrift ? 'DRIFT DETECTED' : 'STABLE'}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overall PSI:</span>
                  <span className="font-mono font-bold">{report.overallPsi.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Feature KS (D):</span>
                  <span className="font-mono">{report.maxFeatureKs.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Drifted Features:</span>
                  <span>{report.driftedFeatureCount} features</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recorded At:</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(report.recordedAt).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
