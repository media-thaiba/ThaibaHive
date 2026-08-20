/**
 * Gap Remediation Advisor Card Component
 * Sprint-042 (ARES) — ARES-022
 */

'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RemediationRecommendation } from '@/lib/security/resilience/resilience-types';

interface RemediationAdvisorCardProps {
  recommendations: RemediationRecommendation[];
}

export function RemediationAdvisorCard({ recommendations }: RemediationAdvisorCardProps) {
  if (recommendations.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">AI Resilience Hardening Recommendations</CardTitle>
        <CardDescription className="text-xs">
          Prioritized actionable steps to elevate system resilience scores and eliminate fault vulnerability gaps
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec) => (
          <div key={rec.recommendationId} className="p-3 border rounded-lg bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs">{rec.title}</span>
              <div className="flex space-x-2">
                <Badge variant="success">+{rec.estimatedScoreImpact} pts</Badge>
                <Badge variant="outline">Effort: {rec.effort}</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{rec.description}</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              {rec.remediationSteps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
