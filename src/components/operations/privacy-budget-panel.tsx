'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { usePrivacyBudget } from '@/lib/hooks/use-privacy-budget';

export function PrivacyBudgetPanel() {
  const { budget, isLoading, error } = usePrivacyBudget('global');

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

  const consumedPct = budget ? ((budget.consumedEpsilon / budget.totalBudgetEpsilon) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Differential Privacy Budget Radar (ε, δ-DP)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium text-muted-foreground">Total Budget (ε)</div>
              <div className="text-2xl font-bold">{budget?.totalBudgetEpsilon.toFixed(2) ?? '10.00'}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium text-muted-foreground">Consumed (ε)</div>
              <div className="text-2xl font-bold text-warning">{budget?.consumedEpsilon.toFixed(2) ?? '0.00'}</div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-sm font-medium text-muted-foreground">Remaining (ε)</div>
              <div className="text-2xl font-bold text-success">{budget?.remainingEpsilon.toFixed(2) ?? '10.00'}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span>Budget Utilization: {consumedPct}%</span>
            <Badge variant={budget?.isExhausted ? 'destructive' : 'success'}>
              {budget?.isExhausted ? 'EXHAUSTED' : 'ACTIVE'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
