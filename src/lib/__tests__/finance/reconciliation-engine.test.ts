import { FeeDbStore } from '../../../db/fee-store';
import { ReconciliationEngine } from '../../operations/finance/reconciliation/reconciliation-engine';
import { StatementParser } from '../../operations/finance/reconciliation/statement-parser';
import { FeePaymentItem } from '../../operations/finance/types';

describe('ReconciliationEngine & Statement Matching (Sprint-057 - FEE-009)', () => {
  let store: FeeDbStore;
  let engine: ReconciliationEngine;

  beforeEach(() => {
    store = FeeDbStore.getInstance();
    store.clearMemoryStore();
    engine = new ReconciliationEngine(store);
  });

  it('should parse CSV statements and match against completed payments', async () => {
    const payment1: FeePaymentItem = {
      id: 'pay-001',
      paymentNumber: 'PAY-2026-0001',
      institutionId: 'inst-campus-1',
      allocationId: 'alloc-1',
      studentId: 'stud-1',
      amount: 45000,
      fineAmount: 0,
      discountAmount: 0,
      netAmount: 45000,
      currency: 'INR',
      paymentMethod: 'bank_transfer',
      paymentStatus: 'completed',
      transactionReference: 'NEFT99887766',
      paidAt: '2026-08-15T10:00:00.000Z',
      createdAt: '2026-08-15T10:00:00.000Z',
      updatedAt: '2026-08-15T10:00:00.000Z',
    };

    const payment2: FeePaymentItem = {
      id: 'pay-002',
      paymentNumber: 'PAY-2026-0002',
      institutionId: 'inst-campus-1',
      allocationId: 'alloc-2',
      studentId: 'stud-2',
      amount: 30000,
      fineAmount: 0,
      discountAmount: 0,
      netAmount: 30000,
      currency: 'INR',
      paymentMethod: 'upi',
      paymentStatus: 'completed',
      transactionReference: 'UPI77665544',
      paidAt: '2026-08-16T11:30:00.000Z',
      createdAt: '2026-08-16T11:30:00.000Z',
      updatedAt: '2026-08-16T11:30:00.000Z',
    };

    await store.recordPayment(payment1);
    await store.recordPayment(payment2);

    const csvData = StatementParser.generateSampleCsv([
      { date: '2026-08-15', ref: 'NEFT99887766', amount: 45000, desc: 'NEFT Inward PAY-2026-0001' },
      { date: '2026-08-16', ref: 'UPI77665544', amount: 30000, desc: 'UPI Direct Credit' },
      { date: '2026-08-17', ref: 'UNKNOWN999', amount: 12000, desc: 'Direct Cash Deposit Unmatched' },
    ]);

    const { batch, result } = await engine.reconcileStatement('inst-campus-1', csvData, 'bank_statement');

    expect(batch.totalTransactions).toBe(3);
    expect(result.matchedPairs.length).toBe(2);
    expect(result.unmatchedBankLines.length).toBe(1);
    expect(result.unmatchedBankLines[0].referenceNumber).toBe('UNKNOWN999');
    expect(result.discrepancyAmount).toBe(12000);
    expect(batch.status).toBe('discrepancy_flagged');
  });
});
