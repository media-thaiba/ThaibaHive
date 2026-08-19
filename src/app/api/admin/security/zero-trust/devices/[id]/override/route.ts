import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { TrustOverrideManager } from '@/lib/security/trust/trust-override-manager';
import { deviceTrustOverrideSchema } from '@/lib/validation/zasm-schemas';
import { ZasmAuditLogger } from '@/lib/security/zasm/zasm-audit-events';

export const POST = withDPoP(
  requireAuth(async (req: Request, _session, context) => {
    try {
      const params = await context?.params;
      const deviceId = params?.id || '';
      const body = await req.json();
      const parsed = deviceTrustOverrideSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
      }

      const override = TrustOverrideManager.getInstance().applyOverride({
        deviceId,
        forcedScore: parsed.data.forcedScore,
        reason: parsed.data.reason,
        appliedBy: 'admin',
        ttlHours: parsed.data.ttlHours,
      });

      await ZasmAuditLogger.logTrustOverridden(override);

      return NextResponse.json({ success: true, override }, { status: 200 });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
  }, 'system:security:manage'),
  { required: false }
);

export const DELETE = withDPoP(
  requireAuth(async (_req: Request, _session, context) => {
    const params = await context?.params;
    const deviceId = params?.id || '';
    const removed = TrustOverrideManager.getInstance().removeOverride(deviceId);
    if (!removed) {
      return NextResponse.json({ error: 'No active override found for device' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Override removed for ${deviceId}` });
  }, 'system:security:manage'),
  { required: false }
);
