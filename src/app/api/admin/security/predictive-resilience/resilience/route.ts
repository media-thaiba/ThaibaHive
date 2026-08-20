/**
 * Admin System Resilience Score & Remediation Route
 * Sprint-042 (ARES) — ARES-020
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { ResilienceCalculator } from '@/lib/security/resilience/resilience-calculator';
import { ResilienceTrendAnalyzer } from '@/lib/security/resilience/trend-analyzer';
import { RemediationAdvisor } from '@/lib/security/resilience/remediation-advisor';
import { AresDbStore } from '@/lib/security/ares/ares-db-store';

export const GET = withDPoP(
  requireAuth(async () => {
    const calc = ResilienceCalculator.getInstance();
    const trendAnalyzer = ResilienceTrendAnalyzer.getInstance(calc);
    const store = AresDbStore.getInstance();

    const snapshot = calc.calculateSystemResilience();
    await store.saveResilienceSnapshot(snapshot);

    const trends = trendAnalyzer.analyzeTrends();
    const recommendations = RemediationAdvisor.generateRecommendations(snapshot);

    return NextResponse.json({
      snapshot,
      trends,
      recommendations,
    });
  }, 'system:security:view'),
  { required: false }
);
