'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { useCampusBenchmarks } from '@/lib/hooks/use-campus-benchmarks';

export function CrossCampusBenchmarksTab() {
  const { benchmarks, isLoading, error } = useCampusBenchmarks();

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
        <h3 className="text-lg font-medium">Confidential Cross-Campus Institutional Benchmarking</h3>
        <p className="text-sm text-muted-foreground">
          Privacy-preserving IPEDS / HESA indicator percentiles aggregated via SMPC.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {benchmarks.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              No cross-campus benchmark computations available.
            </CardContent>
          </Card>
        ) : (
          benchmarks.map((bench) => (
            <Card key={bench.campusId} className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-semibold">{bench.campusName}</CardTitle>
                <Badge variant={bench.rankPosition === 1 ? 'success' : 'info'}>
                  RANK #{bench.rankPosition} OF {bench.totalParticipatingCampuses}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retention Rate:</span>
                  <span className="font-semibold">{bench.metrics.retentionRatePercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retention Percentile:</span>
                  <span className="font-mono text-xs">{bench.percentiles.retentionRatePercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Graduation Rate:</span>
                  <span>{bench.metrics.graduationRatePercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student-Faculty Ratio:</span>
                  <span>{bench.metrics.studentFacultyRatio}:1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average GPA:</span>
                  <span className="font-bold">{bench.metrics.averageAcademicGpa}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
