import { FeeDbStore } from '../../../db/fee-store';
import { AgingAnalyticsEngine } from '../../operations/finance/aging/aging-analytics-engine';
import { FeeStudentAllocationItem } from '../../operations/finance/types';

describe('AgingAnalyticsEngine (Sprint-057 - FEE-014)', () => {
  let store: FeeDbStore;
  let engine: AgingAnalyticsEngine;

  beforeEach(() => {
    store = FeeDbStore.getInstance();
    store.clearMemoryStore();
    engine = new AgingAnalyticsEngine(store);
  });

  it('should categorize student dues into 30/60/90 days buckets and assign risk score', () => {
    const allocation: FeeStudentAllocationItem = {
      id: 'alloc-aging-1',
      institutionId: 'inst-campus-1',
      studentId: 'stud-overdue-1',
      feeStructureId: 'struct-1',
      academicYear: '2026-2027',
      baseAmount: 60000,
      concessionAmount: 0,
      netPayableAmount: 60000,
      paidAmount: 0,
      balanceAmount: 60000,
      status: 'unpaid',
      allocationDate: '2026-06-01',
      createdAt: '2026-06-01',
      updatedAt: '2026-06-01',
      installments: [
        {
          id: 'inst-1',
          allocationId: 'alloc-aging-1',
          installmentNumber: 1,
          title: 'Term 1',
          dueDate: '2026-06-15',
          gracePeriodDays: 7,
          amount: 60000,
          paidAmount: 0,
          balanceAmount: 60000,
          fineAmount: 0,
          fineWaivedAmount: 0,
          status: 'pending',
          createdAt: '2026-06-01',
          updatedAt: '2026-06-01',
        },
      ],
    };

    // As of 2026-08-25 -> ~71 days overdue (Bucket: 61_90)
    const analysis = engine.evaluateStudentAging(allocation, '2026-08-25');

    expect(analysis.agingBucket).toBe('61_90');
    expect(analysis.daysOverdue).toBeGreaterThanOrEqual(65);
    expect(analysis.shouldBlockHallTicket).toBe(true);
    expect(analysis.riskScore).toBeGreaterThan(60);
  });

  it('should aggregate multi-student campus aging summary', async () => {
    const a1: FeeStudentAllocationItem = {
      id: 'a1',
      institutionId: 'inst-1',
      studentId: 's1',
      feeStructureId: 'st1',
      academicYear: '2026-2027',
      baseAmount: 50000,
      concessionAmount: 0,
      netPayableAmount: 50000,
      paidAmount: 50000,
      balanceAmount: 0,
      status: 'paid',
      allocationDate: '2026-06-01',
      dueDate: '2026-07-01',
      createdAt: '2026-06-01',
      updatedAt: '2026-06-01',
    };

    const a2: FeeStudentAllocationItem = {
      id: 'a2',
      institutionId: 'inst-1',
      studentId: 's2',
      feeStructureId: 'st1',
      academicYear: '2026-2027',
      baseAmount: 50000,
      concessionAmount: 0,
      netPayableAmount: 50000,
      paidAmount: 20000,
      balanceAmount: 30000,
      status: 'partial',
      allocationDate: '2026-06-01',
      dueDate: '2026-07-15', // Overdue as of Aug 25
      createdAt: '2026-06-01',
      updatedAt: '2026-06-01',
    };

    await store.createAllocation(a1);
    await store.createAllocation(a2);

    const summary = await engine.getCampusAgingSummary('inst-1', '2026-08-25');

    expect(summary.totalReceivable).toBe(30000);
    expect(summary.totalOverdue).toBe(30000);
    expect(summary.defaulterStudentCount).toBe(1);
    expect(summary.collectionRatePercent).toBe(70); // 70k paid out of 100k
  });
});
