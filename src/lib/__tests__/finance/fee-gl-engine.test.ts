import { FeeGLEngine } from '../../operations/finance/gl/fee-gl-engine';
import { FeePaymentItem, FeeStudentAllocationItem, FeeStructureItem, FeeConcessionItem } from '../../operations/finance/types';

describe('FeeGLEngine & Double-Entry Accounting Invariant (Sprint-057 - FEE-008)', () => {
  it('should generate balanced double-entry journals for fee allocations', () => {
    const structure: FeeStructureItem = {
      id: 's1',
      institutionId: 'inst-1',
      name: 'Fee Structure 2026',
      code: 'FS-2026',
      academicYear: '2026-2027',
      term: 'annual',
      quota: 'general',
      residentialType: 'day_scholar',
      currency: 'INR',
      totalAmount: 100000,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      components: [
        {
          id: 'c1',
          feeStructureId: 's1',
          name: 'Tuition Fee',
          componentType: 'tuition',
          amount: 70000,
          isMandatory: true,
          isRefundable: false,
          taxRatePercent: 0,
          glAccountCode: 'GL:4100-TUITION_REVENUE',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'c2',
          feeStructureId: 's1',
          name: 'Transport',
          componentType: 'transport',
          amount: 30000,
          isMandatory: true,
          isRefundable: false,
          taxRatePercent: 0,
          glAccountCode: 'GL:4300-TRANSPORT_REVENUE',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const allocation: FeeStudentAllocationItem = {
      id: 'alloc-1',
      institutionId: 'inst-1',
      studentId: 'stud-1',
      feeStructureId: 's1',
      academicYear: '2026-2027',
      baseAmount: 100000,
      concessionAmount: 0,
      netPayableAmount: 100000,
      paidAmount: 0,
      balanceAmount: 100000,
      status: 'unpaid',
      allocationDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const journals = FeeGLEngine.generateAllocationJournals(allocation, structure);

    expect(journals.length).toBe(2);
    expect(FeeGLEngine.validateJournalBalance(journals)).toBe(true);

    const totalDebits = journals.reduce((sum, j) => sum + j.amount, 0);
    expect(totalDebits).toBe(100000);
  });

  it('should generate balanced journals for payment collection including late fines', () => {
    const payment: FeePaymentItem = {
      id: 'pay-1',
      paymentNumber: 'PAY-2026-0001',
      institutionId: 'inst-1',
      allocationId: 'alloc-1',
      studentId: 'stud-1',
      amount: 50000,
      fineAmount: 1500,
      discountAmount: 0,
      netAmount: 51500,
      currency: 'INR',
      paymentMethod: 'razorpay',
      paymentStatus: 'completed',
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const journals = FeeGLEngine.generatePaymentJournals(payment);

    expect(journals.length).toBe(2); // 1 principal fee, 1 fine
    expect(FeeGLEngine.validateJournalBalance(journals)).toBe(true);

    const totalAmount = journals.reduce((sum, j) => sum + j.amount, 0);
    expect(totalAmount).toBe(51500);
  });

  it('should generate balanced journals for scholarship concessions and settlements', () => {
    const concession: FeeConcessionItem = {
      id: 'conc-1',
      institutionId: 'inst-1',
      studentId: 'stud-1',
      allocationId: 'alloc-1',
      amount: 25000,
      reason: 'Merit Award',
      status: 'approved',
      appliedById: 'staff-1',
      decisionDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const concJournals = FeeGLEngine.generateConcessionJournals(concession);
    expect(FeeGLEngine.validateJournalBalance(concJournals)).toBe(true);

    const settleJournals = FeeGLEngine.generateSettlementJournals('inst-1', 'SETTLE-001', 98000, 2000, 100000);
    expect(FeeGLEngine.validateJournalBalance(settleJournals)).toBe(true);
    expect(settleJournals[0].amount + settleJournals[1].amount).toBe(100000);
  });
});
