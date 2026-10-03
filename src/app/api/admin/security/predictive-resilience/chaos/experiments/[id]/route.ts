/**
 * Admin Chaos Experiment Detail Route
 * Sprint-042 (ARES) — ARES-020
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { ScenarioRegistry } from '@/lib/security/chaos/scenario-registry';

export const GET = withDPoP(
  requireAuth(async (_req: Request, _session, context) => {
    const params = await context?.params;
    const scenarioId = params?.id || '';
    const scenario = ScenarioRegistry.getInstance().getScenario(scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: 'Chaos scenario not found' }, { status: 404 });
    }
    return NextResponse.json({ scenario });
  }, 'system:security:view'),
  { required: false }
);
