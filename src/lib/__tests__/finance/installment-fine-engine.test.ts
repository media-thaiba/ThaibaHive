import { FeeDbStore } from '../../../db/fee-store';
import { InstallmentFineEngine, LateFinePolicy } from '../../operations/finance/installment-fine-engine';
import { FeeInstallmentItem } from '../../operations/finance/types';

describe('InstallmentFineEngine (Sprint-057 - FEE-004)', () => {
  let store: FeeDbStore;
  let engine: InstallmentFineEngine;

  beforeEach(() => {
    store = FeeDbStore.getInstance();
    store.clearMemoryStore();
    engine = new InstallmentFineEngine(store);
  });

  it('should generate balanced semesterly, quarterly, and custom installment schedules', () => {
    const totalAmount = 100000;

    // Semesterly
    const semSchedule = engine.generateInstallments('alloc-1', totalAmount, 'semesterly', undefined, '2026-06-01');
    expect(semSchedule.length).toBe(2);
    expect(semSchedule[0].amount).toBe(50000);
    expect(semSchedule[1].amount).toBe(50000);
    expect(semSchedule[0].amount + semSchedule[1].amount).toBe(totalAmount);

    // Quarterly
    const qtrSchedule = engine.generateInstallments('alloc-1', totalAmount, 'quarterly', undefined, '2026-06-01');
    expect(qtrSchedule.length).toBe(4);
    const qtrSum = qtrSchedule.reduce((sum, item) => sum + item.amount, 0);
    expect(qtrSum).toBe(totalAmount);

    // Custom 40-30-30
    const customSplits = [
      { percentage: 40, dueDate: '2026-07-01', title: 'Advance Term' },
      { percentage: 30, dueDate: '2026-11-01', title: 'Mid Term' },
      { percentage: 30, dueDate: '2027-02-01', title: 'Final Term' },
    ];
    const customSchedule = engine.generateInstallments('alloc-1', totalAmount, 'custom', customSplits);
    expect(customSchedule.length).toBe(3);
    expect(customSchedule[0].amount).toBe(40000);
    expect(customSchedule[1].amount).toBe(30000);
    expect(customSchedule[2].amount).toBe(30000);
  });

  it('should calculate late fines across flat daily, monthly percentage, and stepped slab modes', () => {
    const installment: FeeInstallmentItem = {
      id: 'inst-1',
      allocationId: 'alloc-1',
      installmentNumber: 1,
      title: 'Term 1',
      dueDate: '2026-08-01',
      gracePeriodDays: 7, // Grace expires 2026-08-08
      amount: 50000,
      paidAmount: 0,
      balanceAmount: 50000,
      fineAmount: 0,
      fineWaivedAmount: 0,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Case 1: Within Grace Period (e.g. 2026-08-05) -> 0 Fine
    const withinGrace = engine.calculateLateFine(installment, '2026-08-05');
    expect(withinGrace.isOverdue).toBe(false);
    expect(withinGrace.effectiveFine).toBe(0);

    // Case 2: Flat Daily (e.g. 2026-08-18 -> 17 days past due, 10 billable days @ ₹50 = ₹500)
    const flatPolicy: LateFinePolicy = {
      mode: 'flat_daily',
      gracePeriodDays: 7,
      flatDailyRate: 50,
    };
    const flatResult = engine.calculateLateFine(installment, '2026-08-18', flatPolicy);
    expect(flatResult.isOverdue).toBe(true);
    expect(flatResult.overdueDays).toBe(10);
    expect(flatResult.effectiveFine).toBe(500);

    // Case 3: Stepped Slab Policy (e.g. 2026-09-10 -> 40 days past due, 33 billable days -> Slab 3: ₹3000)
    const slabPolicy: LateFinePolicy = {
      mode: 'stepped_slab',
      gracePeriodDays: 7,
      slabs: [
        { minDays: 1, maxDays: 15, fixedFine: 500 },
        { minDays: 16, maxDays: 30, fixedFine: 1500 },
        { minDays: 31, maxDays: 9999, fixedFine: 3000 },
      ],
    };
    const slabResult = engine.calculateLateFine(installment, '2026-09-10', slabPolicy);
    expect(slabResult.isOverdue).toBe(true);
    expect(slabResult.effectiveFine).toBe(3000);
  });

  it('should allocate partial payment sequentially across installments', () => {
    const installments: FeeInstallmentItem[] = [
      {
        id: 'inst-1',
        allocationId: 'alloc-1',
        installmentNumber: 1,
        title: 'Term 1',
        dueDate: '2026-08-01',
        gracePeriodDays: 7,
        amount: 30000,
        paidAmount: 0,
        balanceAmount: 30000,
        fineAmount: 0,
        fineWaivedAmount: 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'inst-2',
        allocationId: 'alloc-1',
        installmentNumber: 2,
        title: 'Term 2',
        dueDate: '2026-12-01',
        gracePeriodDays: 7,
        amount: 30000,
        paidAmount: 0,
        balanceAmount: 30000,
        fineAmount: 0,
        fineWaivedAmount: 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Pay 45,000: Clears Installment 1 (30k) and pays 15k toward Installment 2
    const allocations = engine.allocatePaymentAcrossInstallments(installments, 45000);
    expect(allocations.length).toBe(2);
    expect(allocations[0]).toEqual({
      installmentId: 'inst-1',
      appliedAmount: 30000,
      updatedStatus: 'paid',
    });
    expect(allocations[1]).toEqual({
      installmentId: 'inst-2',
      appliedAmount: 15000,
      updatedStatus: 'partially_paid',
    });
  });
});
