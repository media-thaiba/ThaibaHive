/**
 * Resilience Score Matrix Component
 * Sprint-042 (ARES) — ARES-022
 */

'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SystemResilienceSnapshot } from '@/lib/security/resilience/resilience-types';

interface ResilienceScoreMatrixProps {
  snapshot: SystemResilienceSnapshot | null;
  loading?: boolean;
}

export function ResilienceScoreMatrix({ snapshot, loading: _loading }: ResilienceScoreMatrixProps) {
  if (!snapshot) {
    return null;
  }

  const vectors = Object.values(snapshot.vectors);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">System Resilience Scorecard</h2>
          <p className="text-sm text-muted-foreground">
            Multi-vector benchmark evaluation across fault tolerance, MTTR, and zero-trust coverage
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={snapshot.overallScore >= 85 ? 'success' : snapshot.overallScore >= 70 ? 'info' : 'warning'}>
            Tier: {snapshot.tier}
          </Badge>
          <Badge variant="outline" className="text-sm font-bold">
            Score: {snapshot.overallScore} / 100
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {vectors.map((vec) => (
          <Card key={vec.vectorName} className="border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Badge variant={vec.status === 'OPTIMAL' ? 'success' : 'warning'}>{vec.status}</Badge>
                <span className="text-xs text-muted-foreground">Weight: {(vec.weight * 100).toFixed(0)}%</span>
              </div>
              <CardTitle className="text-sm font-semibold mt-2">{vec.vectorName}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="text-2xl font-bold">{vec.score}</div>
              <div className="text-xs text-muted-foreground">
                {Object.entries(vec.factors)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' | ')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
