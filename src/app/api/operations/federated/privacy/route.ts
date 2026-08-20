import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { PrivacyBudgetManager } from '@/lib/operations/privacy/privacy-budget-manager';

export const GET = requireAuth(async (req: Request) => {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || 'global';
    const manager = new PrivacyBudgetManager();
    const budget = manager.getBudget(tenantId);

    return NextResponse.json({ budget });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}, 'operations:read');
