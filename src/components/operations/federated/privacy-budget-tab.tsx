'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { usePrivacyBudget } from '@/lib/hooks/use-privacy-budget';

export function PrivacyBudgetTab() {
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
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Differential Privacy ($\epsilon, \delta$-DP) Budget Accountant</h3>
        <p className="text-sm text-muted-foreground">
          Real-time Moments Accountant tracking institutional privacy guarantees under GDPR & FERPA.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget ($\epsilon$)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budget?.totalBudgetEpsilon.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Tenant Target Cap</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Consumed Epsilon ($\epsilon$)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{budget?.consumedEpsilon.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{consumedPct}% Budget Utilized</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Budget</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{budget?.remainingEpsilon.toFixed(2)}</div>
            <Badge variant={budget?.isExhausted ? 'destructive' : 'success'}>
              {budget?.isExhausted ? 'EXHAUSTED' : 'HEALTHY'}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
