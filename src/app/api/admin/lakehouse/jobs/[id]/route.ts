import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { db } from '@/db';
import { dataLakehouseJobs } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const GET = requireAuth(async (_request, _session, context) => {
  try {
    const { id } = await context!.params;
    const [job] = await db.select().from(dataLakehouseJobs).where(eq(dataLakehouseJobs.id, id));

    if (!job) {
      return NextResponse.json({ error: 'Lakehouse export job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}, 'lakehouse:manage');
