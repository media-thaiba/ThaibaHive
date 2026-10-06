import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { PrivacyBudgetManager } from '@/lib/operations/privacy/privacy-budget-manager';

export const GET = requireAuth(async (req: Request, session) => {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = await resolveRequestInstitution(session, searchParams.get('tenantId') || searchParams.get('institutionId'));
    const manager = new PrivacyBudgetManager();
    const budget = manager.getBudget(tenantId);

    return NextResponse.json({ budget });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}, 'operations:read');
