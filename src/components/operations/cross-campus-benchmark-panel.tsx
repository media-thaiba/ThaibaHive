'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { useCampusBenchmarks } from '@/lib/hooks/use-campus-benchmarks';

export function CrossCampusBenchmarkPanel() {
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Confidential Cross-Campus Institutional Rankings (IPEDS/HESA)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {benchmarks.map((bench) => (
              <div key={bench.campusId} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <div className="font-semibold">{bench.campusName}</div>
                  <div className="text-sm text-muted-foreground">
                    Retention: {bench.metrics?.retentionRatePercent?.toFixed(1) ?? '0'}% | Average GPA: {bench.metrics?.averageAcademicGpa?.toFixed(2) ?? '0'}
                  </div>
                </div>
                <Badge variant="info">Rank #{bench.rankPosition ?? 1}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
