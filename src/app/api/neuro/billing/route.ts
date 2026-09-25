import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { neuroStore } from '@/lib/db/neuro-store';
import { GrantAllocationManager } from '@/lib/operations/neuro/billing/grant-allocation-manager';
import { DoubleEntryLedger } from '@/lib/operations/neuro/billing/double-entry-ledger';
import { grantAllocationSchema } from '@/lib/validation/neuro-schemas';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (req: Request, user: any) => {
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user?.institutionId || 'global';
  const departmentId = searchParams.get('departmentId') || undefined;
  const accountId = searchParams.get('accountId') || undefined;
  const action = searchParams.get('action');

  if (accountId && action === 'reconcile') {
    const ledger = new DoubleEntryLedger(neuroStore);
    const reconciliation = await ledger.reconcileAccount(accountId, tenantId);
    return NextResponse.json({ reconciliation });
  }

  const accounts = await neuroStore.listBillingAccounts(departmentId, tenantId);
  const transactions = accountId ? await neuroStore.listLedgerTransactions(accountId, tenantId) : [];

  return NextResponse.json({ accounts, transactions });
}, 'neuro:billing:view');

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = grantAllocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid grant allocation payload' }, { status: 400 });
    }

    const tenantId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    const manager = new GrantAllocationManager(neuroStore);

    const result = await manager.allocateGrantTokens(
      parsed.data.accountNumber,
      parsed.data.departmentId,
      parsed.data.grantNumber,
      parsed.data.fundingAgency,
      parsed.data.tokens,
      user?.id || 'staff_admin',
      parsed.data.effectiveDate,
      parsed.data.expiryDate,
      tenantId
    );

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'neuro:billing:manage');
