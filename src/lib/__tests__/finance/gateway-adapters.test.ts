import crypto from 'crypto';
import { GatewayAdapterFactory } from '../../operations/finance/gateways/gateway-adapter-factory';
import { RazorpayAdapter } from '../../operations/finance/gateways/razorpay-adapter';
import { StripeAdapter } from '../../operations/finance/gateways/stripe-adapter';
import { UpiAdapter } from '../../operations/finance/gateways/upi-adapter';

describe('Payment Gateway Adapters & Factory (Sprint-057 - FEE-005)', () => {
  let factory: GatewayAdapterFactory;

  beforeEach(() => {
    factory = GatewayAdapterFactory.getInstance();
  });

  it('should create order and verify valid HMAC signatures for Razorpay', async () => {
    const keySecret = 'test_secret_123';
    const adapter = new RazorpayAdapter('rzp_test_1', keySecret, 'webhook_sec_1');

    const order = await adapter.createOrder({
      orderId: 'app_order_1',
      amount: 15000,
      currency: 'INR',
      receiptNumber: 'RCPT-001',
      customerName: 'Fatima Al-Zahra',
      customerEmail: 'fatima@thaiba.edu',
    });

    expect(order.gatewayOrderId).toBeDefined();
    expect(order.amount).toBe(15000);
    expect(order.clientPayload.amount).toBe(1500000); // Subunits (paise)

    // Verify correct HMAC signature
    const orderId = order.gatewayOrderId;
    const paymentId = 'pay_999888';
    const validSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(
      adapter.verifyPaymentSignature({
        orderId,
        paymentId,
        signature: validSignature,
      })
    ).toBe(true);

    // Tampered signature should fail
    expect(
      adapter.verifyPaymentSignature({
        orderId,
        paymentId,
        signature: 'invalid_tampered_signature',
      })
    ).toBe(false);
  });

  it('should create order and parse webhooks for Stripe', async () => {
    const webhookSecret = 'whsec_test_abc';
    const adapter = new StripeAdapter('pk_test_1', 'sk_test_1', webhookSecret);

    const order = await adapter.createOrder({
      orderId: 'order_stripe_1',
      amount: 500,
      currency: 'USD',
      receiptNumber: 'RCPT-INT-001',
    });

    expect(order.gatewayOrderId.startsWith('pi_')).toBe(true);
    expect(order.clientPayload.clientSecret).toBeDefined();

    // Verify webhook payload parsing
    const rawPayload = JSON.stringify({
      id: 'evt_stripe_123',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123',
          amount: 50000,
          currency: 'usd',
        },
      },
    });

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${rawPayload}`)
      .digest('hex');
    const header = `t=${timestamp},v1=${signature}`;

    const webhookResult = await adapter.processWebhookPayload(rawPayload, header);
    expect(webhookResult.signatureVerified).toBe(true);
    expect(webhookResult.status).toBe('completed');
    expect(webhookResult.amount).toBe(500);
    expect(webhookResult.currency).toBe('USD');
  });

  it('should generate valid NPCI UPI payment deep link URIs', async () => {
    const adapter = new UpiAdapter('thaiba.fees@hdfcbank', 'Thaiba Garden Group');
    const order = await adapter.createOrder({
      orderId: 'upi_ord_1',
      amount: 7500,
      currency: 'INR',
      receiptNumber: 'RCPT-UPI-101',
    });

    expect(order.clientPayload.upiUri).toContain('upi://pay?pa=thaiba.fees@hdfcbank');
    expect(order.clientPayload.upiUri).toContain('am=7500.00');
    expect(order.clientPayload.upiUri).toContain('cu=INR');
  });

  it('should route requests and handle gateway failover in GatewayAdapterFactory', () => {
    // Normal INR -> Razorpay
    const inrGateway = factory.resolveBestGateway('INR');
    expect(inrGateway.gatewayName).toBe('razorpay');

    // Normal USD -> Stripe
    const usdGateway = factory.resolveBestGateway('USD');
    expect(usdGateway.gatewayName).toBe('stripe');

    // If Razorpay is down, fallback to UPI
    factory.setGatewayHealth('razorpay', false);
    const failoverGateway = factory.resolveBestGateway('INR');
    expect(failoverGateway.gatewayName).toBe('upi');

    // Restore health
    factory.setGatewayHealth('razorpay', true);
  });
});
