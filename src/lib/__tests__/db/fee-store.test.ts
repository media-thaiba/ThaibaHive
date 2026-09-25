import { FeeDbStore } from '../../../db/fee-store';
import { FeeStructureItem, FeeStudentAllocationItem, FeePaymentItem, FeeScholarshipItem, FeeCounterRegisterItem } from '../../operations/finance/types';

describe('FeeDbStore CRUD & Tenant Isolation (Sprint-057 - FEE-002)', () => {
  let store: FeeDbStore;

  beforeEach(() => {
    store = FeeDbStore.getInstance();
    store.clearMemoryStore();
  });

  it('should create and retrieve a fee structure with components', async () => {
    const structure: FeeStructureItem = {
      id: 'struct-001',
      institutionId: 'inst-campus-a',
      name: 'B.Tech CS 2026-27',
      code: 'CS-2026-REG',
      academicYear: '2026-2027',
      term: 'annual',
      quota: 'general',
      residentialType: 'day_scholar',
      currency: 'INR',
      totalAmount: 120000,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      components: [
        {
          id: 'comp-001',
          feeStructureId: 'struct-001',
          name: 'Tuition Fee',
          componentType: 'tuition',
          amount: 80000,
          isMandatory: true,
          isRefundable: false,
          taxRatePercent: 0,
          glAccountCode: 'GL:4100-TUITION',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'comp-002',
          feeStructureId: 'struct-001',
          name: 'Laboratory Fee',
          componentType: 'lab',
          amount: 40000,
          isMandatory: true,
          isRefundable: false,
          taxRatePercent: 0,
          glAccountCode: 'GL:4200-LAB',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    await store.createFeeStructure(structure);
    const fetched = await store.getFeeStructureById('struct-001', 'inst-campus-a');

    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('B.Tech CS 2026-27');
    expect(fetched?.components?.length).toBe(2);

    // Test tenant isolation
    const foreignTenant = await store.getFeeStructureById('struct-001', 'inst-campus-b');
    expect(foreignTenant).toBeNull();
  });

  it('should manage student fee allocations and installment updates', async () => {
    const allocation: FeeStudentAllocationItem = {
      id: 'alloc-001',
      institutionId: 'inst-campus-a',
      studentId: 'student-101',
      feeStructureId: 'struct-001',
      academicYear: '2026-2027',
      baseAmount: 100000,
      concessionAmount: 10000,
      netPayableAmount: 90000,
      paidAmount: 0,
      balanceAmount: 90000,
      status: 'unpaid',
      allocationDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      installments: [
        {
          id: 'inst-001',
          allocationId: 'alloc-001',
          installmentNumber: 1,
          title: 'Term 1 Due',
          dueDate: '2026-09-15',
          gracePeriodDays: 7,
          amount: 45000,
          paidAmount: 0,
          balanceAmount: 45000,
          fineAmount: 0,
          fineWaivedAmount: 0,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'inst-002',
          allocationId: 'alloc-001',
          installmentNumber: 2,
          title: 'Term 2 Due',
          dueDate: '2027-01-15',
          gracePeriodDays: 7,
          amount: 45000,
          paidAmount: 0,
          balanceAmount: 45000,
          fineAmount: 0,
          fineWaivedAmount: 0,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    await store.createAllocation(allocation);
    const fetched = await store.getAllocationById('alloc-001', 'inst-campus-a');

    expect(fetched).toBeDefined();
    expect(fetched?.installments?.length).toBe(2);

    await store.updateInstallment('inst-001', { paidAmount: 45000, balanceAmount: 0, status: 'paid' });
    const updated = await store.getAllocationById('alloc-001', 'inst-campus-a');
    expect(updated?.installments?.[0].status).toBe('paid');
  });

  it('should record payment, transactions, and enforce cashier shift balance reconciliation', async () => {
    const payment: FeePaymentItem = {
      id: 'pay-001',
      paymentNumber: 'PAY-2026-0001',
      institutionId: 'inst-campus-a',
      allocationId: 'alloc-001',
      studentId: 'student-101',
      amount: 45000,
      fineAmount: 0,
      discountAmount: 0,
      netAmount: 45000,
      currency: 'INR',
      paymentMethod: 'razorpay',
      paymentStatus: 'completed',
      gatewayOrderId: 'order_rzp_123',
      gatewayPaymentId: 'pay_rzp_456',
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.recordPayment(payment, [
      {
        id: 'tx-001',
        paymentId: 'pay-001',
        installmentId: 'inst-001',
        allocatedAmount: 45000,
        glDebitAccount: 'GL:1100-BANK_CASH',
        glCreditAccount: 'GL:1200-FEE_RECEIVABLE',
        createdAt: new Date().toISOString(),
      },
    ]);

    const retrieved = await store.getPaymentById('pay-001', 'inst-campus-a');
    expect(retrieved?.paymentNumber).toBe('PAY-2026-0001');
    expect(retrieved?.transactions?.length).toBe(1);

    // Counter Register shift open and close variance
    const counter: FeeCounterRegisterItem = {
      id: 'reg-001',
      institutionId: 'inst-campus-a',
      cashierId: 'staff-cashier-1',
      counterName: 'Fee Counter 1',
      openingFloat: 5000,
      systemCashTotal: 45000,
      systemPosTotal: 0,
      systemChequeTotal: 0,
      cashDropsTotal: 0,
      varianceAmount: 0,
      status: 'open',
      openedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.openCounterRegister(counter);
    const closed = await store.closeCounterRegister('reg-001', 50000, 'staff-supervisor-1', 'Verified balanced');
    expect(closed?.status).toBe('closed');
    expect(closed?.varianceAmount).toBe(0); // 50000 - (5000 + 45000) = 0
  });
});
