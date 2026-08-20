/**
 * Predictive Threat Radar Component
 * Sprint-042 (ARES) — ARES-022
 */

'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PredictiveThreatForecast } from '@/lib/security/ares/ares-types';

interface PredictiveThreatRadarProps {
  threats: PredictiveThreatForecast[];
  loading?: boolean;
  onTriggerForecast?: () => void;
}

export function PredictiveThreatRadar({ threats, loading, onTriggerForecast }: PredictiveThreatRadarProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const getSeverityBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'CRITICAL_FORECAST':
        return 'destructive';
      case 'HIGH_FORECAST':
        return 'warning';
      case 'ELEVATED_RISK':
        return 'info';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Bayesian Predictive Threat Radar</h2>
          <p className="text-sm text-muted-foreground">
            Probabilistic anticipation of emerging attack vectors (7–14 day forecast windows)
          </p>
        </div>
        {onTriggerForecast && (
          <Button onClick={onTriggerForecast} variant="default" size="sm">
            Recalculate Bayesian Forecasts
          </Button>
        )}
      </div>

      {threats.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No emerging high-risk threats detected across active Bayesian priors.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {threats.map((threat) => (
            <Card key={threat.forecastId} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant={getSeverityBadgeVariant(threat.severityTier)}>
                    {threat.severityTier.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Exploit Window: ~{threat.projectedExploitWindowDays} days
                  </span>
                </div>
                <CardTitle className="text-base font-semibold mt-2">
                  {threat.threatCategory.replace(/_/g, ' ')}
                </CardTitle>
                <CardDescription className="text-xs">
                  Posterior Probability: {(threat.posteriorProbability * 100).toFixed(1)}% | Confidence: {threat.confidenceScore}%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div>
                  <span className="text-xs font-medium text-foreground">Recommended Preemptive Actions:</span>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground list-disc list-inside">
                    {threat.recommendedMitigations.map((mitigation, idx) => (
                      <li key={idx}>{mitigation}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
