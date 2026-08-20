import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { AfedDbStore } from '@/lib/operations/persistence/afed-db-store';

const dbStore = AfedDbStore.getInstance();

export const GET = requireAuth(async (request: Request) => {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'global';

    let budget = dbStore.getPrivacyBudget(tenantId);
    if (!budget) {
      budget = {
        tenantId,
        totalBudgetEpsilon: 10.0,
        consumedEpsilon: 1.5,
        remainingEpsilon: 8.5,
        totalBudgetDelta: 1e-5,
        isExhausted: false,
      };
      dbStore.savePrivacyBudget(budget);
    }

    return NextResponse.json({ success: true, budget }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch privacy budget' },
      { status: 500 }
    );
  }
}, 'federated:read');
