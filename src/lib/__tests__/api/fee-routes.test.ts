import { GET as getStructures, POST as createStructure } from '../../../app/api/finance/fees/structures/route';
import { GET as getAllocations, POST as createAllocation } from '../../../app/api/finance/fees/allocations/route';
import { POST as createCheckout } from '../../../app/api/finance/fees/checkout/route';
import { POST as handleWebhook } from '../../../app/api/finance/fees/webhooks/route';
import { GET as getVerifyReceipt } from '../../../app/api/finance/fees/verify/[hash]/route';
import { FeeDbStore } from '../../../db/fee-store';

describe('Fee Management REST API Routes (Sprint-057 - FEE-016)', () => {
  beforeEach(() => {
    FeeDbStore.getInstance().clearMemoryStore();
  });

  const mockAdminReq = (body?: any, searchParams?: Record<string, string>): Request => {
    const url = new URL('https://thaiba.edu/api/test');
    if (searchParams) {
      for (const [k, v] of Object.entries(searchParams)) {
        url.searchParams.set(k, v);
      }
    }
    return new Request(url.toString(), {
      method: body ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-token-admin',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  it('should create and list fee structures via API', async () => {
    const body = {
      institutionId: 'inst-001',
      name: 'B.Tech AI 2026-27',
      code: 'BTECH-AI-26',
      academicYear: '2026-2027',
      quota: 'general',
      residentialType: 'day_scholar',
      currency: 'INR',
      totalAmount: 120000,
      components: [
        {
          name: 'Tuition Fee',
          componentType: 'tuition',
          amount: 100000,
          isMandatory: true,
          glAccountCode: 'GL:4100-TUITION',
        },
        {
          name: 'Lab & Cloud GPU',
          componentType: 'lab',
          amount: 20000,
          isMandatory: true,
          glAccountCode: 'GL:4200-LAB',
        },
      ],
    };

    const postReq = mockAdminReq(body);
    const postRes = await (createStructure as any)(postReq, { userId: 'u-1', staffId: 'staff-1', role: 'admin' });
    const postData = await postRes.json();

    expect(postRes.status).toBe(201);
    expect(postData.success).toBe(true);
    expect(postData.structure.name).toBe('B.Tech AI 2026-27');

    const getReq = mockAdminReq(undefined, { institutionId: 'inst-001' });
    const getRes = await (getStructures as any)(getReq, { userId: 'u-1', role: 'admin' });
    const getData = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(getData.structures.length).toBe(1);
  });

  it('should allocate student fee and create checkout session via API', async () => {
    const store = FeeDbStore.getInstance();
    await store.createFeeStructure({
      id: 'struct-101',
      institutionId: 'inst-001',
      name: 'Standard Fee',
      code: 'STD-FEE',
      academicYear: '2026-2027',
      term: 'annual',
      quota: 'general',
      residentialType: 'day_scholar',
      currency: 'INR',
      totalAmount: 80000,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      components: [
        {
          id: 'c1',
          feeStructureId: 'struct-101',
          name: 'Tuition',
          componentType: 'tuition',
          amount: 80000,
          isMandatory: true,
          isRefundable: false,
          taxRatePercent: 0,
          glAccountCode: 'GL:4100-TUITION',
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const allocReq = mockAdminReq({
      institutionId: 'inst-001',
      studentId: 'stud-101',
      feeStructureId: 'struct-101',
      academicYear: '2026-2027',
      planType: 'semesterly',
    });

    const allocRes = await (createAllocation as any)(allocReq, { userId: 'u-1', role: 'admin' });
    const allocData = await allocRes.json();

    expect(allocRes.status).toBe(201);
    expect(allocData.allocation.netPayableAmount).toBe(80000);
    expect(allocData.allocation.installments.length).toBe(2);

    // Checkout
    const checkoutReq = mockAdminReq({
      allocationId: allocData.allocation.id,
      amount: 40000,
      currency: 'INR',
      paymentMethod: 'razorpay',
      customerName: 'Ahmad Khan',
      customerEmail: 'ahmad@thaiba.edu',
    });

    const checkoutRes = await (createCheckout as any)(checkoutReq, { userId: 'u-1', role: 'student' });
    const checkoutData = await checkoutRes.json();

    expect(checkoutRes.status).toBe(200);
    expect(checkoutData.order.gatewayOrderId).toBeDefined();
    expect(checkoutData.payment.paymentNumber).toBeDefined();
  });

  it('should verify public receipt lookup endpoint', async () => {
    const store = FeeDbStore.getInstance();
    const receiptHash = 'hash_test_verified_123';

    await store.recordPayment({
      id: 'pay-v1',
      paymentNumber: 'PAY-2026-V1',
      institutionId: 'inst-001',
      allocationId: 'alloc-v1',
      studentId: 'stud-v1',
      amount: 50000,
      fineAmount: 0,
      discountAmount: 0,
      netAmount: 50000,
      currency: 'INR',
      paymentMethod: 'upi',
      paymentStatus: 'completed',
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await store.createReceipt({
      id: 'rcpt-v1',
      receiptNumber: 'RCPT-V1',
      institutionId: 'inst-001',
      paymentId: 'pay-v1',
      studentId: 'stud-v1',
      receiptHash,
      signature: 'sig-v1',
      qrPayload: `/verify/receipt/${receiptHash}`,
      downloadCount: 0,
      issuedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    const verifyReq = new Request(`https://thaiba.edu/api/finance/fees/verify/${receiptHash}`);
    const verifyRes = await (getVerifyReceipt as any)(verifyReq, { params: Promise.resolve({ hash: receiptHash }) });
    const verifyData = await verifyRes.json();

    expect(verifyRes.status).toBe(200);
    expect(verifyData.success).toBe(true);
    expect(verifyData.receiptNumber).toBe('RCPT-V1');
  });
});
