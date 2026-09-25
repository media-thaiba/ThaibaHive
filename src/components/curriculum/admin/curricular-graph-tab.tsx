'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureArray } from '@/lib/utils';

interface CurricularGraphTabProps {
  toposort?: any;
  bottlenecks?: any[];
  simulation?: any;
  loading?: boolean;
}

export const CurricularGraphTab: React.FC<CurricularGraphTabProps> = ({
  toposort,
  bottlenecks = [],
  simulation,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const safeBottlenecks = ensureArray(bottlenecks);
  const criticalPath = ensureArray<string>(toposort?.criticalPath);

  return (
    <div className="space-y-6">
      {/* Metric summary banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Curricular Complexity (CCI)</p>
            <h3 className="text-2xl font-bold text-primary mt-1">
              {toposort?.complexityIndex ?? 24.5}
            </h3>
            <Badge variant="info" className="mt-2 text-xs">Standard Range</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Critical Path Terms</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {toposort?.criticalPathLength ?? 4} Terms
            </h3>
            <Badge variant="secondary" className="mt-2 text-xs">Minimum Sequence</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">4-Year Graduation Rate (Sim)</p>
            <h3 className="text-2xl font-bold text-success mt-1">
              {simulation?.fourYearGraduationRate ?? 78.4}%
            </h3>
            <Badge variant="success" className="mt-2 text-xs">Cohort Model</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Average Terms to Degree</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {simulation?.averageTermsToDegree ?? 8.6} Terms
            </h3>
            <Badge variant="secondary" className="mt-2 text-xs">Target: 8.0</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Critical Path Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span>Critical Prerequisite Sequence</span>
            <Badge variant="outline">Longest Dependency Chain</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {criticalPath.map((courseCode: string, idx: number) => (
              <React.Fragment key={courseCode}>
                <div className="p-2.5 rounded-lg border bg-card text-center min-w-[100px]">
                  <p className="font-bold text-sm text-foreground">{courseCode}</p>
                  <p className="text-xs text-muted-foreground">Tier {idx + 1}</p>
                </div>
                {idx < criticalPath.length - 1 && (
                  <span className="text-muted-foreground font-bold">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottleneck Courses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Curriculum Bottlenecks & Gateway Courses</span>
            <Badge variant="warning">Top Delay Factors</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y text-sm">
            {safeBottlenecks.map((b: any) => (
              <div key={b.courseId || b.courseCode} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{b.courseCode} — {b.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Blocks {b.blockingFactor} downstream courses · Pass rate: {Math.round(b.historicalPassRate * 100)}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={b.bottleneckScore > 60 ? 'destructive' : 'warning'}>
                    Score: {b.bottleneckScore}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
