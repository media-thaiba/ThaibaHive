import { DiscrepancyResolver } from '../../../operations/supply/matching/discrepancy-resolver';
import { ThreeWayMatchingEngine } from '../../../operations/supply/matching/three-way-matching-engine';
import { MatchingLineItemInput } from '../../../operations/supply/matching/matching-types';

describe('DiscrepancyResolver & DebitMemo (SUPPLY-008)', () => {
  let resolver: DiscrepancyResolver;
  let matchingEngine: ThreeWayMatchingEngine;

  beforeEach(() => {
    resolver = DiscrepancyResolver.getInstance();
    matchingEngine = ThreeWayMatchingEngine.getInstance();
  });

  it('should generate debit memo and partial payment voucher for damaged or short goods', () => {
    const lines: MatchingLineItemInput[] = [
      {
        itemSku: 'HVAC-VALVE-2IN',
        description: '2-inch Brass Ball Valve',
        poUnitPriceUsd: 80.0,
        poQuantityOrdered: 10,
        grnQuantityReceived: 8, // 2 missing
        invoiceUnitPriceUsd: 80.0,
        invoiceQuantityBilled: 10,
      },
    ];

    const matchEval = matchingEngine.reconcileDocuments('po-valve', 'inv-valve', 'grn-valve', lines);
    expect(matchEval.isToleranceCompliant).toBe(false);

    const resolution = resolver.resolveDiscrepancy(
      matchEval,
      'ven-plumbing',
      {
        actionType: 'generate_debit_memo',
        actorUserId: 'buyer-sarah',
        justification: 'Vendor short shipped 2 valves; applying debit memo deduction',
      },
      'inst-1'
    );

    expect(resolution.success).toBe(true);
    expect(resolution.resolutionStatus).toBe('debit_memo_issued');
    expect(resolution.debitMemo).toBeDefined();
    expect(resolution.debitMemo?.deductionAmountUsd).toBe(160.0);
    expect(resolution.paymentVoucherCode).toContain('VOUCHER-PARTIAL-');
  });

  it('should support managerial price override with audit justification', () => {
    const lines: MatchingLineItemInput[] = [
      {
        itemSku: 'CHEM-SOLVENT-5L',
        description: 'Laboratory Solvent 5L Canister',
        poUnitPriceUsd: 100.0,
        poQuantityOrdered: 5,
        grnQuantityReceived: 5,
        invoiceUnitPriceUsd: 105.0, // 5% increase (> 2% tolerance)
        invoiceQuantityBilled: 5,
      },
    ];

    const matchEval = matchingEngine.reconcileDocuments('po-chem', 'inv-chem', 'grn-chem', lines);
    expect(matchEval.isToleranceCompliant).toBe(false);

    const resolution = resolver.resolveDiscrepancy(
      matchEval,
      'ven-chem',
      {
        actionType: 'approve_override',
        actorUserId: 'cfo-finance-head',
        justification: 'Approved expedited hazardous freight surcharge by email agreement',
      },
      'inst-1'
    );

    expect(resolution.success).toBe(true);
    expect(resolution.resolutionStatus).toBe('override_approved');
    expect(resolution.paymentVoucherCode).toContain('VOUCHER-OVERRIDE-');
    expect(resolution.auditTrailRecord).toContain('approved by cfo-finance-head');
  });
});
