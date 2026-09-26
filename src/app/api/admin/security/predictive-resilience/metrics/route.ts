/**
 * Admin Predictive Resilience Summary Stats Route
 * Sprint-042 (ARES) — ARES-020
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { AresDbStore } from '@/lib/security/ares/ares-db-store';
import { ChaosEngine } from '@/lib/security/chaos/chaos-engine';
import { ResilienceCalculator } from '@/lib/security/resilience/resilience-calculator';
import { Neo4jThreatGraphAdapter } from '@/lib/security/graph/neo4j-adapter';

export const GET = withDPoP(
  requireAuth(async () => {
    const store = AresDbStore.getInstance();
    const chaosEngine = ChaosEngine.getInstance();
    const resilienceCalc = ResilienceCalculator.getInstance();
    const graphAdapter = Neo4jThreatGraphAdapter.getInstance();

    const threats = await store.listPredictiveThreats(5);
    const executions = await store.listChaosExecutions(5);
    const resilience = resilienceCalc.calculateSystemResilience();
    const nodes = graphAdapter.listNodes();

    return NextResponse.json({
      activeThreatForecastsCount: threats.length,
      chaosScenariosAvailable: chaosEngine.getAvailableScenarios().length,
      chaosExecutionsCount: executions.length,
      overallResilienceScore: resilience.overallScore,
      resilienceTier: resilience.tier,
      threatGraphNodesCount: nodes.length,
    });
  }, 'system:security:view'),
  { required: false }
);
