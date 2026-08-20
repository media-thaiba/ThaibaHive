import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { afedPrivacyBudgetResetSchema } from '@/lib/validation/schemas';
import { AfedDbStore } from '@/lib/operations/persistence/afed-db-store';
import { AfedAuditLogger } from '@/lib/operations/persistence/afed-audit-events';

const dbStore = AfedDbStore.getInstance();

export const POST = requireAuth(async (request: Request) => {
  try {
    const body = await request.json();
    const parse = afedPrivacyBudgetResetSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Validation failed', details: parse.error.format() }, { status: 400 });
    }

    const { tenantId, newBudgetEpsilon, reason } = parse.data;

    const updatedBudget = {
      tenantId,
      totalBudgetEpsilon: newBudgetEpsilon,
      consumedEpsilon: 0,
      remainingEpsilon: newBudgetEpsilon,
      totalBudgetDelta: 1e-5,
      isExhausted: false,
    };

    dbStore.savePrivacyBudget(updatedBudget);

    await AfedAuditLogger.logEvent({
      eventType: 'afed.privacy.budget_consumed',
      tenantId,
      details: { newBudgetEpsilon, reason },
    });

    return NextResponse.json({ success: true, budget: updatedBudget }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reset privacy budget' },
      { status: 500 }
    );
  }
}, 'federated:manage');
