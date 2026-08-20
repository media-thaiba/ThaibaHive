import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { afedDriftEvaluateSchema } from '@/lib/validation/schemas';
import { CovariateShiftMonitor } from '@/lib/operations/drift/covariate-shift-monitor';
import { AfedDbStore } from '@/lib/operations/persistence/afed-db-store';
import { AfedMetricsTracker } from '@/lib/operations/persistence/afed-metrics';
import { AfedAuditLogger } from '@/lib/operations/persistence/afed-audit-events';

const dbStore = AfedDbStore.getInstance();
const metricsTracker = AfedMetricsTracker.getInstance();

export const GET = requireAuth(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId') || undefined;

    const reports = dbStore.getDriftMetrics(modelId);
    return NextResponse.json({ success: true, reports }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch drift reports' },
      { status: 500 }
    );
  }
}, 'federated:read');

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = afedDriftEvaluateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { modelId, features } = parse.data;
    const summary = CovariateShiftMonitor.evaluateModelDrift(modelId, features);

    dbStore.saveDriftMetrics({
      modelId,
      overallPsi: summary.overallPsi,
      maxFeatureKs: summary.maxFeatureKs,
      driftedFeatureCount: summary.driftedFeatureCount,
      hasSignificantDrift: summary.hasSignificantDrift,
      featureReportsData: JSON.stringify(summary.featureReports),
    });

    metricsTracker.setDriftPsiScore(modelId, summary.overallPsi);

    if (summary.hasSignificantDrift) {
      await AfedAuditLogger.logEvent({
        eventType: 'afed.drift.detected',
        modelId,
        details: { psi: summary.overallPsi, maxKs: summary.maxFeatureKs },
      });
    }

    return NextResponse.json({ success: true, summary }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Drift evaluation failed' },
      { status: 500 }
    );
  }
}, 'federated:manage');
