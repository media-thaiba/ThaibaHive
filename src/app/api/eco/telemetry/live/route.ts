import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { EnergyTelemetryIngester } from '@/lib/operations/eco/telemetry/energy-telemetry-ingester';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, session: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = await resolveRequestInstitution(session, searchParams.get("tenantId"));

  const ingester = EnergyTelemetryIngester.getInstance();
  const snapshot = await ingester.getCampusPowerSnapshot(tenantId);
  return NextResponse.json({ snapshot });
}, 'eco:carbon:view');
