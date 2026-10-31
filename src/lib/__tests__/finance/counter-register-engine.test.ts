import { FeeDbStore } from '../../../db/fee-store';
import { CounterRegisterEngine } from '../../operations/finance/counter/counter-register-engine';

describe('CounterRegisterEngine & Cashier Shift Float Operations (Sprint-057 - FEE-011)', () => {
  let store: FeeDbStore;
  let engine: CounterRegisterEngine;

  beforeEach(() => {
    store = FeeDbStore.getInstance();
    store.clearMemoryStore();
    engine = new CounterRegisterEngine(store);
  });

  it('should manage shift lifecycle: open, record collections, cash drop, and close with variance check', async () => {
    // 1. Open shift with ₹10,000 float
    const shift = await engine.openShift('inst-1', 'staff-cashier-1', 'Admin Counter 1', 10000);
    expect(shift.status).toBe('open');
    expect(shift.openingFloat).toBe(10000);

    // 2. Record transactions (paymentId is now required so the shift total
    //    is anchored to a real, completed fee payment row)
    await store.recordPayment({
      id: 'pay-tx-1',
      paymentNumber: 'PAY-TX-001',
      institutionId: 'inst-1',
      allocationId: 'alloc-1',
      studentId: 'stud-1',
      amount: 25000,
      fineAmount: 0,
      discountAmount: 0,
      netAmount: 25000,
      currency: 'INR',
      paymentMethod: 'cash',
      paymentStatus: 'completed',
      counterRegisterId: shift.id,
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await engine.recordShiftTransaction(shift.id, 'cash', 25000, 'pay-tx-1');

    await store.recordPayment({
      id: 'pay-tx-2',
      paymentNumber: 'PAY-TX-002',
      institutionId: 'inst-1',
      allocationId: 'alloc-1',
      studentId: 'stud-1',
      amount: 15000,
      fineAmount: 0,
      discountAmount: 0,
      netAmount: 15000,
      currency: 'INR',
      paymentMethod: 'cash',
      paymentStatus: 'completed',
      counterRegisterId: shift.id,
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await engine.recordShiftTransaction(shift.id, 'cash', 15000, 'pay-tx-2');

    await store.recordPayment({
      id: 'pay-tx-3',
      paymentNumber: 'PAY-TX-003',
      institutionId: 'inst-1',
      allocationId: 'alloc-1',
      studentId: 'stud-1',
      amount: 30000,
      fineAmount: 0,
      discountAmount: 0,
      netAmount: 30000,
      currency: 'INR',
      paymentMethod: 'pos_card',
      paymentStatus: 'completed',
      counterRegisterId: shift.id,
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await engine.recordShiftTransaction(shift.id, 'pos_card', 30000, 'pay-tx-3');

    await store.recordPayment({
      id: 'pay-tx-4',
      paymentNumber: 'PAY-TX-004',
      institutionId: 'inst-1',
      allocationId: 'alloc-1',
      studentId: 'stud-1',
      amount: 20000,
      fineAmount: 0,
      discountAmount: 0,
      netAmount: 20000,
      currency: 'INR',
      paymentMethod: 'cheque',
      paymentStatus: 'completed',
      counterRegisterId: shift.id,
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await engine.recordShiftTransaction(shift.id, 'cheque', 20000, 'pay-tx-4');

    // Current cash in drawer: 10,000 + 40,000 = 50,000
    // 3. Perform cash drop of ₹30,000 to vault
    await engine.recordCashDrop(shift.id, 30000, 'staff-supervisor-1');

    // Expected cash remaining in drawer: 50,000 - 30,000 = 20,000
    // 4. Close shift declaring ₹20,000 physical cash
    const summary = await engine.closeShift(shift.id, 20000, 'staff-supervisor-1', 'Balanced shift verified');

    expect(summary.register.status).toBe('closed');
    expect(summary.expectedCashInDrawer).toBe(20000);
    expect(summary.register.varianceAmount).toBe(0);
    expect(summary.isBalanced).toBe(true);
    expect(summary.totalCollectedAllModes).toBe(90000); // 40k cash + 30k pos + 20k cheque
    expect(summary.paymentCount).toBe(4);
  });
});
