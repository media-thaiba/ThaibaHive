import { ThreeWayMatchingEngine } from '../../../operations/supply/matching/three-way-matching-engine';
import { MatchingLineItemInput } from '../../../operations/supply/matching/matching-types';

describe('ThreeWayMatchingEngine (SUPPLY-007)', () => {
  let engine: ThreeWayMatchingEngine;

  beforeEach(() => {
    engine = ThreeWayMatchingEngine.getInstance();
  });

  it('should cleanly match when PO, GRN, and Invoice line quantities and prices are identical', () => {
    const lines: MatchingLineItemInput[] = [
      {
        itemSku: 'SRV-DRIVE-2TB',
        description: '2TB NVMe PCIe 4.0 SSD',
        poUnitPriceUsd: 200.0,
        poQuantityOrdered: 10,
        grnQuantityReceived: 10,
        invoiceUnitPriceUsd: 200.0,
        invoiceQuantityBilled: 10,
      },
      {
        itemSku: 'SRV-CABLE-SFP',
        description: '10G SFP+ Cable',
        poUnitPriceUsd: 30.0,
        poQuantityOrdered: 5,
        grnQuantityReceived: 5,
        invoiceUnitPriceUsd: 30.0,
        invoiceQuantityBilled: 5,
      },
    ];

    const result = engine.reconcileDocuments('po-1', 'inv-1', 'grn-1', lines);
    expect(result.isToleranceCompliant).toBe(true);
    expect(result.overallMatchStatus).toBe('matched');
    expect(result.paymentVoucherCode).toBeDefined();
    expect(result.paymentVoucherCode).toContain('VOUCHER-AUTO-');
    expect(result.totalDollarVarianceUsd).toBe(0.0);
  });

  it('should tolerate minor unit price variations within +/- 2%', () => {
    const lines: MatchingLineItemInput[] = [
      {
        itemSku: 'LAB-REAGENT-A',
        description: 'Analytical Grade Reagent A',
        poUnitPriceUsd: 100.0,
        poQuantityOrdered: 10,
        grnQuantityReceived: 10,
        invoiceUnitPriceUsd: 101.5, // 1.5% increase (within 2% tolerance)
        invoiceQuantityBilled: 10,
      },
    ];

    const result = engine.reconcileDocuments('po-2', 'inv-2', 'grn-2', lines);
    expect(result.isToleranceCompliant).toBe(true);
    expect(result.overallMatchStatus).toBe('matched');
  });

  it('should flag quantity variance when billed units exceed received goods', () => {
    const lines: MatchingLineItemInput[] = [
      {
        itemSku: 'OFFICE-CHAIR-ERG',
        description: 'Ergonomic Task Chair',
        poUnitPriceUsd: 250.0,
        poQuantityOrdered: 20,
        grnQuantityReceived: 15, // Only 15 received (5 short-shipped)
        invoiceUnitPriceUsd: 250.0,
        invoiceQuantityBilled: 20, // Vendor billed full 20
      },
    ];

    const result = engine.reconcileDocuments('po-3', 'inv-3', 'grn-3', lines);
    expect(result.isToleranceCompliant).toBe(false);
    expect(result.overallMatchStatus).toBe('quantity_variance');
    expect(result.totalQuantityVarianceUnits).toBe(5);
    expect(result.totalDollarVarianceUsd).toBe(1250.0); // 5 * $250
    expect(result.paymentVoucherCode).toBeUndefined();
  });
});
