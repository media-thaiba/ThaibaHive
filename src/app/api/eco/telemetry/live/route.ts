import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { EnergyTelemetryIngester } from '@/lib/operations/eco/telemetry/energy-telemetry-ingester';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';

  const ingester = EnergyTelemetryIngester.getInstance();
  const snapshot = await ingester.getCampusPowerSnapshot(tenantId);
  return NextResponse.json({ snapshot });
}, 'eco:carbon:view');
