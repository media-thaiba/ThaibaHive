import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { db } from '@/db';
import { indexTuningLogs } from '@/db/schema';

export const GET = requireAuth(async () => {
  try {
    const logs = await db.select().from(indexTuningLogs);
    return NextResponse.json({ history: logs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch index tuning history' }, { status: 500 });
  }
}, 'database:admin');
