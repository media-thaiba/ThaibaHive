import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { FeeDbStore } from '@/db/fee-store';
import { AgingAnalyticsEngine } from '@/lib/operations/finance/aging/aging-analytics-engine';
import { DefaulterOutreachEngine } from '@/lib/operations/finance/aging/defaulter-outreach-engine';
import { dispatchReminderSchema } from '@/lib/validation/fee-schemas';

export const GET = requireAuth(async (request) => {
  const url = new URL(request.url);
  const institutionId = url.searchParams.get('institutionId') || 'global';
  const type = url.searchParams.get('type') || 'summary'; // 'summary' | 'logs'

  const store = FeeDbStore.getInstance();
  if (type === 'logs') {
    const studentId = url.searchParams.get('studentId') || undefined;
    const logs = await store.listDefaulterLogs(institutionId, studentId);
    return NextResponse.json({ success: true, logs });
  }

  const engine = new AgingAnalyticsEngine(store);
  const summary = await engine.getCampusAgingSummary(institutionId);
  return NextResponse.json({ success: true, summary });
}, 'finance:fees:view');

export const POST = requireAuth(async (request) => {
  try {
    const body = await request.json();
    const parsed = dispatchReminderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const store = FeeDbStore.getInstance();
    const engine = new DefaulterOutreachEngine(store);

    const result = await engine.dispatchReminder(
      parsed.data.institutionId,
      parsed.data.allocationId,
      parsed.data.studentName,
      parsed.data.channel
    );

    return NextResponse.json({ success: true, result }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to dispatch reminder' }, { status: 500 });
  }
}, 'finance:fees:manage');
