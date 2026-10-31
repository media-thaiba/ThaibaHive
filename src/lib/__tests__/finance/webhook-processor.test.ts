import crypto from 'crypto';
import { WebhookProcessor } from '../../operations/finance/gateways/webhook-processor';
import { DLQManager } from '../../operations/finance/gateways/dlq-manager';
import { GatewayAdapterFactory } from '../../operations/finance/gateways/gateway-adapter-factory';
import { RazorpayAdapter } from '../../operations/finance/gateways/razorpay-adapter';
import { FeeDbStore } from '../../../db/fee-store';

describe('WebhookProcessor & DLQ Manager (Sprint-057 - FEE-006)', () => {
  let processor: WebhookProcessor;
  let dlq: DLQManager;
  let store: FeeDbStore;
  let factory: GatewayAdapterFactory;
  const webhookSecret = 'test_wh_secret_xyz';

  beforeEach(() => {
    store = FeeDbStore.getInstance();
    store.clearMemoryStore();
    dlq = DLQManager.getInstance();
    dlq.clearQueue();
    factory = GatewayAdapterFactory.getInstance();
    factory.registerAdapter(new RazorpayAdapter('rzp_k1', 'rzp_s1', webhookSecret));

    processor = new WebhookProcessor(factory, dlq, store);
  });

  it('should verify signature and process valid webhook successfully', async () => {
    const rawPayload = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_rzp_999',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_12345',
            order_id: 'order_rzp_111',
            amount: 2500000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });

    const validSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    const result = await processor.handleWebhook('razorpay', rawPayload, validSignature);

    expect(result.success).toBe(true);
    expect(result.isDuplicate).toBe(false);
    expect(result.gatewayPaymentId).toBe('pay_rzp_12345');
    expect(result.status).toBe('completed');
  });

  it('should acknowledge duplicate webhooks idempotently without reprocessing', async () => {
    const rawPayload = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_rzp_dup_1',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_dup_100',
            order_id: 'order_rzp_dup_100',
            amount: 500000,
            currency: 'INR',
          },
        },
      },
    });

    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    // First arrival
    const firstRes = await processor.handleWebhook('razorpay', rawPayload, signature);
    expect(firstRes.success).toBe(true);
    expect(firstRes.isDuplicate).toBe(false);

    // Duplicate arrival (burst/retry)
    const secondRes = await processor.handleWebhook('razorpay', rawPayload, signature);
    expect(secondRes.success).toBe(true);
    expect(secondRes.isDuplicate).toBe(true);
    expect(secondRes.message).toContain('Duplicate event acknowledged idempotently');
  });

  it('should enqueue failed/invalid signatures to Dead-Letter Queue (DLQ)', async () => {
    const rawPayload = JSON.stringify({ event: 'payment.captured', event_id: 'evt_invalid' });
    const invalidSignature = 'bad_sig_123';

    const result = await processor.handleWebhook('razorpay', rawPayload, invalidSignature);

    expect(result.success).toBe(false);
    expect(result.error).toBe('INVALID_SIGNATURE');

    const pendingDLQ = await dlq.listPendingEvents();
    expect(pendingDLQ.length).toBe(1);
    expect(pendingDLQ[0].errorReason).toBe('Invalid HMAC Signature');
  });

  it('applies a completed webhook to allocation balances exactly once across redeliveries', async () => {
    await store.createAllocation({
      id: 'alloc-700',
      institutionId: 'inst-campus-a',
      studentId: 'student-700',
      feeStructureId: 'struct-700',
      academicYear: '2026-2027',
      baseAmount: 20000,
      concessionAmount: 0,
      netPayableAmount: 20000,
      paidAmount: 0,
      balanceAmount: 20000,
      status: 'unpaid',
      allocationDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      installments: [
        {
          id: 'inst-700-1',
          allocationId: 'alloc-700',
          installmentNumber: 1,
          title: 'Term 1 Due',
          dueDate: '2026-09-15',
          gracePeriodDays: 7,
          amount: 20000,
          paidAmount: 0,
          balanceAmount: 20000,
          fineAmount: 0,
          fineWaivedAmount: 0,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    await store.recordPayment({
      id: 'pay_wh_700',
      paymentNumber: 'RCPT-WH-700',
      institutionId: 'inst-campus-a',
      allocationId: 'alloc-700',
      studentId: 'student-700',
      amount: 20000,
      fineAmount: 0,
      discountAmount: 0,
      netAmount: 20000,
      currency: 'INR',
      paymentMethod: 'razorpay',
      paymentStatus: 'initiated',
      gatewayOrderId: 'order_rzp_wh1',
      paidAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const rawPayload = JSON.stringify({
      event: 'payment.captured',
      event_id: 'evt_rzp_wh_1',
      payload: {
        payment: {
          entity: {
            id: 'pay_rzp_wh1',
            order_id: 'order_rzp_wh1',
            amount: 2000000,
            currency: 'INR',
            status: 'captured',
          },
        },
      },
    });
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');

    const first = await processor.handleWebhook('razorpay', rawPayload, signature);
    expect(first.success).toBe(true);

    const payment = await store.getPaymentById('pay_wh_700', 'inst-campus-a');
    expect(payment?.paymentStatus).toBe('completed');
    expect(payment?.gatewayPaymentId).toBe('pay_rzp_wh1');

    let alloc = await store.getAllocationById('alloc-700', 'inst-campus-a');
    expect(alloc?.paidAmount).toBe(20000);
    expect(alloc?.balanceAmount).toBe(0);
    expect(alloc?.status).toBe('paid');
    expect(alloc?.installments?.[0].status).toBe('paid');

    // In-process duplicate → acknowledged without reprocessing
    const dup = await processor.handleWebhook('razorpay', rawPayload, signature);
    expect(dup.isDuplicate).toBe(true);
    alloc = await store.getAllocationById('alloc-700', 'inst-campus-a');
    expect(alloc?.paidAmount).toBe(20000);

    // Simulated restart: in-process dedup memory lost — redelivered webhook must
    // still not double-credit. The DB-backed webhookEvents table survives the
    // restart, so the second arrival is acknowledged as a duplicate.
    const redelivered = await processor.handleWebhook('razorpay', rawPayload, signature);
    expect(redelivered.success).toBe(true);
    alloc = await store.getAllocationById('alloc-700', 'inst-campus-a');
    expect(alloc?.paidAmount).toBe(20000);
    expect(alloc?.balanceAmount).toBe(0);
  });
});
