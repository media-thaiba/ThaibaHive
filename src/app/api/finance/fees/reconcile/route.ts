import { resolveRequestInstitution } from "@/lib/api/auth-guard";
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { FeeDbStore } from '@/db/fee-store';
import { ReconciliationEngine } from '@/lib/operations/finance/reconciliation/reconciliation-engine';
import { reconcileStatementSchema } from '@/lib/validation/fee-schemas';

export const GET = requireAuth(async (request, session) => {
  const url = new URL(request.url);
  const institutionId = await resolveRequestInstitution(session, url.searchParams.get("institutionId"));

  const store = FeeDbStore.getInstance();
  const batches = await store.listReconciliationBatches(institutionId);
  return NextResponse.json({ success: true, batches });
}, 'finance:reconciliation:manage');

export const POST = requireAuth(async (request: Request, session) => {
  try {
    const body = await request.json();
    const parsed = reconcileStatementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const store = FeeDbStore.getInstance();
    const engine = new ReconciliationEngine(store);

    const { batch, result } = await engine.reconcileStatement(
      parsed.data.institutionId,
      parsed.data.statementCsv,
      parsed.data.sourceType,
      parsed.data.statementDate
    );

    return NextResponse.json({ success: true, batch, result }, { status: 201 });
  } catch (err: unknown) {
    console.error("[Fees Reconcile Error]:", err instanceof Error ? err.stack : err);
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}, 'finance:reconciliation:manage');
