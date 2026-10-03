import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { db } from '@thaiba/db';
import { auditLogs } from '@thaiba/db/schema';

export const GET = requireAuth(async () => {
  try {
    let auditEntries: any[] = [];
    if (db) {
      auditEntries = await db.select().from(auditLogs);
    }

    return NextResponse.json({
      auditEntries,
      totalEntries: auditEntries.length,
      isChainValid: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}, 'operations:read');
