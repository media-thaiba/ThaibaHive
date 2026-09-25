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
    processor.clearProcessedKeys();
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
});
