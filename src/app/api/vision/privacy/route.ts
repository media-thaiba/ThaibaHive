import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { VisionDbStore } from '@/lib/db/vision-store';
import { SurveillanceConsentRegistry } from '@/lib/operations/vision/privacy/surveillance-consent-registry';
import { privacyConsentSchema } from '@/lib/validation/vision-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const eventType = searchParams.get('eventType') || undefined;

  const store = VisionDbStore.getInstance();
  const logs = await store.listPrivacyAuditLogs(tenantId, eventType);
  return NextResponse.json({ logs });
}, 'vision:privacy:audit');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const tenantId = user?.institutionId || 'global';
    const registry = new SurveillanceConsentRegistry();

    if (body.action === 'rolling_purge') {
      const daysToKeep = body.daysToKeep || 7;
      const purgeResult = await registry.executeRollingPurge(daysToKeep, tenantId);
      return NextResponse.json(purgeResult, { status: 200 });
    }

    if (body.action === 'dual_auth_deanon') {
      const deanon = await registry.requestDualAuthDeAnonymization({
        incidentId: body.incidentId,
        share1Signer: body.share1Signer,
        share2Signer: body.share2Signer,
        reason: body.reason,
        tenantId,
      });
      return NextResponse.json(deanon, { status: 200 });
    }

    const parsed = privacyConsentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input payload' }, { status: 400 });
    }

    registry.registerConsent({ ...parsed.data, updatedAt: new Date().toISOString() }, tenantId);
    return NextResponse.json({ success: true, consent: parsed.data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'vision:privacy:audit');
