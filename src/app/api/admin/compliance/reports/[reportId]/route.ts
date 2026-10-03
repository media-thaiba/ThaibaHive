import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import type { SessionPayload } from '@thaiba/auth';
import { db, staffInstitutions } from '@thaiba/db';
import { eq } from 'drizzle-orm';

async function handler(req: Request, session: SessionPayload, context?: { params: Promise<Record<string, string>> }) {
  const params = await context?.params;
  const reportId = params?.['reportId'];

  if (!reportId) {
    return NextResponse.json({ error: 'Missing reportId' }, { status: 400 });
  }

  let institutionId: string | null = null;
  try {
    const userInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, session.staffId))
      .get();
    if (userInst) {
      institutionId = userInst.institutionId;
    }
  } catch (err) {
    console.warn("Error fetching user institution scope:", err);
  }

  // In production, fetch report from compliance_reports table scoped to institutionId
  return NextResponse.json({
    reportId,
    status: 'ready',
    institutionId,
    retrievedAt: new Date().toISOString(),
  });
}

export const GET = requireAuth(handler, 'compliance:manage');