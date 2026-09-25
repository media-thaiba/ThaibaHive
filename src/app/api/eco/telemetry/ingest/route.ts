import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { EnergyTelemetryIngester } from '@/lib/operations/eco/telemetry/energy-telemetry-ingester';
import { energyTelemetryIngestSchema } from '@/lib/validation/eco-schemas';

export const dynamic = 'force-dynamic';

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = energyTelemetryIngestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid telemetry payload' }, { status: 400 });
    }

    const tenantId = user?.institutionId || parsed.data.institutionId || 'global';
    const ingester = EnergyTelemetryIngester.getInstance();

    const telemetry = {
      telemetryId: parsed.data.telemetryId || `telem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      assetId: parsed.data.assetId,
      sourceType: parsed.data.sourceType,
      powerKw: parsed.data.powerKw,
      energyKwh: parsed.data.energyKwh,
      voltageV: parsed.data.voltageV,
      currentA: parsed.data.currentA,
      powerFactor: parsed.data.powerFactor,
      frequencyHz: parsed.data.frequencyHz,
      socPercent: parsed.data.socPercent,
      carbonGramsPerKwh: parsed.data.carbonGramsPerKwh,
      recordedAt: parsed.data.recordedAt || new Date().toISOString(),
      institutionId: tenantId,
    };

    const result = await ingester.ingest(telemetry);
    return NextResponse.json({ status: result.status, record: result.record }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'eco:telemetry:ingest');
