import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { optimizationPredictSchema } from '@/lib/validation/twin-schemas';
import { TwinDbStore } from '@/lib/db/twin-store';
import { OccupancyForecaster } from '@/lib/operations/twin/ml/occupancy-forecaster';
import { HvacEnergyOptimizer } from '@/lib/operations/twin/ml/hvac-energy-optimizer';
import { TwinMetrics } from '@/lib/operations/twin/telemetry/twin-metrics';

const store = TwinDbStore.getInstance();
const metrics = TwinMetrics.getInstance();

export const POST = requireAuth(async (request: Request, user: any) => {
  try {
    const body = await request.json();
    const parse = optimizationPredictSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { facilityId, spaceId, enableHvacOptimization, institutionId } = parse.data;
    const tenantId = institutionId || user?.institutionId || 'global';

    const space = await store.getSpaceById(spaceId, tenantId);
    if (!space) {
      return NextResponse.json({ error: 'Space not found' }, { status: 404 });
    }

    const forecast = OccupancyForecaster.forecastNext24Hours(spaceId, space.capacity || 30);
    const summary = OccupancyForecaster.summarizeForecast(forecast);

    let hvacReport = null;
    if (enableHvacOptimization) {
      hvacReport = HvacEnergyOptimizer.optimizeHvacSchedule(facilityId, spaceId, forecast);
      metrics.setEnergyReductionKwh(tenantId, facilityId, hvacReport.kwhSaved);
    }
    metrics.setSpaceUtilization(tenantId, facilityId, summary.avgUtilizationPct / 100);

    return NextResponse.json(
      {
        success: true,
        spaceId,
        facilityId,
        forecast,
        summary,
        hvacOptimization: hvacReport,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Optimization forecast failed' }, { status: 500 });
  }
}, 'twin:optimization:manage');
