import { BudgetEncumbranceEngine } from '../../../operations/supply/finance/budget-encumbrance-engine';
import { ProcurementLedgerPoster } from '../../../operations/supply/finance/procurement-ledger-poster';

describe('BudgetEncumbranceEngine (SUPPLY-010)', () => {
  let engine: BudgetEncumbranceEngine;

  beforeEach(() => {
    engine = BudgetEncumbranceEngine.getInstance();
    ProcurementLedgerPoster.clearHistory();
  });

  it('should prevent PO encumbrance when requested amount exceeds available budget headroom', () => {
    // Budget: $50,000; Encumbered: $30,000; Spent: $15,000; Available: $5,000. Request: $8,000
    const validation = engine.validateBudgetHeadroom('dept-cs', 'BUDGET-CS-2026', 8000, 50000, 30000, 15000);
    expect(validation.isEligible).toBe(false);
    expect(validation.availableHeadroomUsd).toBe(5000);
    expect(validation.error).toContain('Insufficient budget headroom');
  });

  it('should lock encumbrance and post balanced double-entry journal entry', () => {
    const { encumbrance, journalEntry } = engine.lockEncumbrance(
      'po-server-99',
      'dept-cs',
      'BUDGET-CS-2026',
      4500.0,
      'inst-1'
    );

    expect(encumbrance.status).toBe('active');
    expect(encumbrance.encumberedAmountUsd).toBe(4500.0);
    expect(journalEntry.entryType).toBe('ENCUMBRANCE_HOLD');
    expect(journalEntry.debitAccount).toBe('GL:ENCUMBRANCE_EXPENSE');
    expect(journalEntry.creditAccount).toBe('GL:ENCUMBRANCE_RESERVE');

    const history = ProcurementLedgerPoster.listEntriesByPo('po-server-99');
    expect(history.length).toBe(1);
  });

  it('should liquidate encumbrance upon invoice match and post accounts payable recognition', () => {
    const { liquidationEntry, payableEntry } = engine.liquidateOnInvoiceMatch(
      'po-server-99',
      'inv-server-99',
      4500.0,
      'inst-1'
    );

    expect(liquidationEntry.entryType).toBe('ENCUMBRANCE_LIQUIDATION');
    expect(liquidationEntry.debitAccount).toBe('GL:ENCUMBRANCE_RESERVE');
    expect(liquidationEntry.creditAccount).toBe('GL:ENCUMBRANCE_EXPENSE');

    expect(payableEntry.entryType).toBe('ACCOUNTS_PAYABLE_RECOGNITION');
    expect(payableEntry.debitAccount).toBe('GL:ACTUAL_OPERATING_EXPENSE');
    expect(payableEntry.creditAccount).toBe('GL:ACCOUNTS_PAYABLE');

    const history = ProcurementLedgerPoster.listEntriesByPo('po-server-99');
    expect(history.length).toBe(2);
  });
});
