import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { SupplyDbStore } from '@/lib/db/supply-store';
import { invoiceMatchSchema } from '@/lib/validation/supply-schemas';
import { ThreeWayMatchingEngine } from '@/lib/operations/supply/matching/three-way-matching-engine';
import { BudgetEncumbranceEngine } from '@/lib/operations/supply/finance/budget-encumbrance-engine';
import { SupplyMerkleAnchor } from '@/lib/operations/supply/security/supply-merkle-anchor';
import { SupplyStreamManager } from '@/lib/operations/supply/streaming/supply-stream-manager';

export const dynamic = 'force-dynamic';

const store = SupplyDbStore.getInstance();
const matchingEngine = ThreeWayMatchingEngine.getInstance();
const encumbranceEngine = BudgetEncumbranceEngine.getInstance();
const merkleAnchor = new SupplyMerkleAnchor(store);
const streamManager = SupplyStreamManager.getInstance();

export const POST = requireAuth(async (req: Request, user: any) => {
  try {
    const body = await req.json();
    const parsed = invoiceMatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid match payload' }, { status: 400 });
    }

    const institutionId = (parsed.data.institutionId !== 'global' ? parsed.data.institutionId : undefined) || user?.institutionId || 'global';
    
    // 1. Run 3-Way Reconciliation
    const evaluation = matchingEngine.reconcileDocuments(
      parsed.data.poId,
      parsed.data.invoiceId,
      parsed.data.receiptId || undefined,
      parsed.data.lines
    );

    const matchId = `match-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const matchRecord = {
      id: matchId,
      matchId,
      invoiceId: parsed.data.invoiceId,
      poId: parsed.data.poId,
      receiptId: parsed.data.receiptId,
      matchStatus: evaluation.overallMatchStatus,
      priceVariancePercent: evaluation.totalPriceVariancePercent,
      quantityVarianceUnits: evaluation.totalQuantityVarianceUnits,
      dollarVarianceUsd: evaluation.totalDollarVarianceUsd,
      isToleranceCompliant: evaluation.isToleranceCompliant,
      debitMemoGenerated: false,
      debitMemoAmountUsd: 0.0,
      paymentVoucherCode: evaluation.paymentVoucherCode || null,
      institutionId,
      createdAt: new Date().toISOString(),
    };

    await store.createThreeWayMatch(matchRecord);

    // 2. If tolerance compliant, liquidate encumbrance and update invoice status
    if (evaluation.isToleranceCompliant) {
      await store.updateInvoiceStatus(parsed.data.invoiceId, 'matched', evaluation.paymentVoucherCode, institutionId);
      await store.liquidateEncumbrance(parsed.data.poId, evaluation.invoiceTotalAmountUsd, institutionId);
      encumbranceEngine.liquidateOnInvoiceMatch(parsed.data.poId, parsed.data.invoiceId, evaluation.invoiceTotalAmountUsd, institutionId);
    } else {
      await store.updateInvoiceStatus(parsed.data.invoiceId, 'discrepancy', undefined, institutionId);
    }

    // 3. Broadcast stream event
    streamManager.broadcast({
      topic: 'matching:variance',
      event: evaluation.isToleranceCompliant ? 'invoice_matched' : 'discrepancy_flagged',
      data: { invoiceId: parsed.data.invoiceId, poId: parsed.data.poId, status: evaluation.overallMatchStatus, varianceUsd: evaluation.totalDollarVarianceUsd },
      timestamp: new Date().toISOString(),
      institutionId,
    });

    // 4. Merkle Anchor
    await merkleAnchor.anchorEvent(
      user?.id || 'system-matcher',
      user?.role || 'admin',
      'three_way_matched',
      'three_way_match',
      matchId,
      { status: evaluation.overallMatchStatus, voucher: evaluation.paymentVoucherCode },
      institutionId
    );

    return NextResponse.json({ evaluation, matchRecord }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'supply:invoices:match');
