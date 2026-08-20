import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { engagePreferenceUpdateSchema } from '@/lib/validation/engage-schemas';
import { EngageDbStore } from '@/lib/db/engage-store';
import { ComplianceAuditLogger } from '@/lib/operations/engage/privacy/compliance-audit';

const store = EngageDbStore.getInstance();
const auditLogger = ComplianceAuditLogger.getInstance();

export const GET = requireAuth(async (request: Request) => {
  try {
    const url = new URL(request.url);
    const recipientId = url.searchParams.get('recipientId');
    if (!recipientId) {
      return NextResponse.json({ error: 'recipientId search param required' }, { status: 400 });
    }

    const preferences = await store.getPreferencesAsync(recipientId, 'global');
    return NextResponse.json({ success: true, preferences }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch preferences' }, { status: 500 });
  }
}, 'engage:preferences:manage');

export const PATCH = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = engagePreferenceUpdateSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const data = parse.data;
    await store.savePreferencesAsync({
      recipientId: data.recipientId,
      recipientType: data.recipientType,
      channelPreferences: data.channelPreferences,
      categorySubscriptions: data.categorySubscriptions,
      quietHoursStart: data.quietHoursStart,
      quietHoursEnd: data.quietHoursEnd,
      timezone: data.timezone,
      isUnsubscribedAll: data.isUnsubscribedAll,
      institutionId: 'global',
    });

    auditLogger.logConsentMutation(
      data.recipientId,
      data.isUnsubscribedAll ? 'opt_out' : 'opt_in',
      { channelPreferences: data.channelPreferences },
      'global'
    );

    return NextResponse.json({ success: true, recipientId: data.recipientId }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update preferences' }, { status: 500 });
  }
}, 'engage:preferences:manage');
