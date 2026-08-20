import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { HvacOptimizer } from '@/lib/operations/energy/hvac-optimizer';
import { AimsDbStore } from '@/lib/operations/persistence/aims-db-store';
import { hvacOptimizationSchema } from '@/lib/validation/aims-schemas';

export const GET = withDPoP(
  requireAuth(async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get('campusId') || undefined;
    const store = AimsDbStore.getInstance();
    const optimizations = store.getEnergyOptimizations(campusId);

    return NextResponse.json({
      optimizations,
      summary: {
        totalSavedKwh: optimizations.reduce((acc, o) => acc + (o.projectedKwhSavings || 0), 0),
        totalCostSavedDollars: optimizations.reduce((acc, o) => acc + (o.projectedCostSavingsDollars || 0), 0),
      },
    });
  }, 'system:energy:manage'),
  { required: false }
);

export const POST = withDPoP(
  requireAuth(async (req: Request) => {
    const body = await req.json();
    const parsed = hvacOptimizationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const optimizer = new HvacOptimizer();
    const reading = {
      sensorId: `sensor_${parsed.data.zoneId}`,
      campusId: parsed.data.campusId,
      buildingId: parsed.data.buildingId,
      zoneId: parsed.data.zoneId,
      temperatureCelsius: parsed.data.currentTempCelsius,
      relativeHumidityPercent: 50.0,
      co2Ppm: 450,
      luxLevel: 300,
      powerKw: 18.0,
      timestamp: new Date().toISOString(),
      institutionId: 'inst_default',
    };

    const forecast = {
      campusId: parsed.data.campusId,
      buildingId: parsed.data.buildingId,
      zoneId: parsed.data.zoneId,
      forecastTimestamp: new Date().toISOString(),
      horizonMinutes: 15 as const,
      predictedHeadcount: 5,
      confidenceInterval: [3, 8] as [number, number],
      occupancyRatio: 0.1,
    };

    const optimization = optimizer.optimizeZoneSetpoint(reading, forecast, false);
    AimsDbStore.getInstance().saveEnergyOptimization(optimization);

    return NextResponse.json({
      success: true,
      optimization,
    });
  }, 'system:energy:manage'),
  { required: false }
);
