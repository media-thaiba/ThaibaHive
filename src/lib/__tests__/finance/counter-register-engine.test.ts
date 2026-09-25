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

    // 2. Record transactions
    await engine.recordShiftTransaction(shift.id, 'cash', 25000);
    await engine.recordShiftTransaction(shift.id, 'cash', 15000);
    await engine.recordShiftTransaction(shift.id, 'pos_card', 30000);
    await engine.recordShiftTransaction(shift.id, 'cheque', 20000);

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
  });
});
