import { FeeDbStore } from '../../../db/fee-store';
import { DefaulterOutreachEngine } from '../../operations/finance/aging/defaulter-outreach-engine';
import { FeeStudentAllocationItem } from '../../operations/finance/types';

describe('DefaulterOutreachEngine (Sprint-057 - FEE-015)', () => {
  let store: FeeDbStore;
  let engine: DefaulterOutreachEngine;

  beforeEach(() => {
    store = FeeDbStore.getInstance();
    store.clearMemoryStore();
    engine = new DefaulterOutreachEngine(store);
  });

  it('should format message and log reminder dispatch to fee_defaulter_logs', async () => {
    const allocation: FeeStudentAllocationItem = {
      id: 'alloc-def-1',
      institutionId: 'inst-1',
      studentId: 'stud-def-1',
      feeStructureId: 'st1',
      academicYear: '2026-2027',
      baseAmount: 40000,
      concessionAmount: 0,
      netPayableAmount: 40000,
      paidAmount: 0,
      balanceAmount: 40000,
      status: 'unpaid',
      allocationDate: '2026-06-01',
      dueDate: '2026-07-01',
      createdAt: '2026-06-01',
      updatedAt: '2026-06-01',
    };

    await store.createAllocation(allocation);

    const result = await engine.dispatchReminder(
      'inst-1',
      'alloc-def-1',
      'Hamza Tariq',
      'whatsapp',
      '2026-08-15'
    );

    expect(result.logId).toBeDefined();
    expect(result.channel).toBe('whatsapp');
    expect(result.messageText).toContain('Hamza Tariq');
    expect(result.messageText).toContain('40,000');
    expect(result.paymentDeepLink).toContain('allocId=alloc-def-1');

    const logs = await store.listDefaulterLogs('inst-1');
    expect(logs.length).toBe(1);
    expect(logs[0].studentId).toBe('stud-def-1');
  });
});
