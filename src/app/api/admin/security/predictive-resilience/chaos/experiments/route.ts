/**
 * Admin Chaos Experiments List & Runner API Endpoint
 * Sprint-042 (ARES) — ARES-020
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { ChaosEngine } from '@/lib/security/chaos/chaos-engine';
import { AresDbStore } from '@/lib/security/ares/ares-db-store';
import { chaosExperimentRunSchema } from '@/lib/validation/ares-schemas';

export const GET = withDPoP(
  requireAuth(async () => {
    const engine = ChaosEngine.getInstance();
    const store = AresDbStore.getInstance();

    const scenarios = engine.getAvailableScenarios();
    const history = await store.listChaosExecutions(25);

    return NextResponse.json({
      scenarios,
      executions: history.length > 0 ? history : engine.getExecutionHistory(),
    });
  }, 'system:security:view'),
  { required: false }
);

export const POST = withDPoP(
  requireAuth(async (req: Request) => {
    const body = await req.json();
    const parsed = chaosExperimentRunSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const engine = ChaosEngine.getInstance();
    const store = AresDbStore.getInstance();

    try {
      const execution = await engine.runScenario(parsed.data.scenarioId);
      await store.saveChaosExecution(execution);

      return NextResponse.json({ execution });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Chaos execution failed' }, { status: 500 });
    }
  }, 'system:security:chaos'),
  { required: false }
);
