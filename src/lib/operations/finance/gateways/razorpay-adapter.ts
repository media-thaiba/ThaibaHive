import crypto from 'crypto';
import {
  PaymentGatewayAdapter,
  CreateOrderRequest,
  CreateOrderResponse,
  VerifySignatureRequest,
  FetchPaymentResponse,
  RefundRequest,
  RefundResponse,
  WebhookEventPayload,
} from './gateway-adapter';
import { PaymentMethod } from '../types';

export class RazorpayAdapter implements PaymentGatewayAdapter {
  public readonly gatewayName: PaymentMethod = 'razorpay';
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor(
    keyId: string = process.env.RAZORPAY_KEY_ID || 'rzp_test_thaiba_mock_key',
    keySecret: string = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_mock_secret',
    webhookSecret: string = process.env.RAZORPAY_WEBHOOK_SECRET || 'rzp_webhook_secret_mock'
  ) {
    this.keyId = keyId;
    this.keySecret = keySecret;
    this.webhookSecret = webhookSecret;
  }

  public async createOrder(params: CreateOrderRequest): Promise<CreateOrderResponse> {
    const amountInSubunits = Math.round(params.amount * 100);
    const mockGatewayOrderId = `order_${Math.random().toString(36).substring(2, 14)}`;

    return {
      gatewayOrderId: mockGatewayOrderId,
      amount: params.amount,
      currency: params.currency || 'INR',
      gatewayKeyId: this.keyId,
      clientPayload: {
        key: this.keyId,
        amount: amountInSubunits,
        currency: params.currency || 'INR',
        name: 'Thaiba Garden Institutions',
        description: `Fee Payment - ${params.receiptNumber}`,
        order_id: mockGatewayOrderId,
        prefill: {
          name: params.customerName || '',
          email: params.customerEmail || '',
          contact: params.customerPhone || '',
        },
        notes: params.notes || {},
        theme: {
          color: '#1E3A8A',
        },
      },
    };
  }

  public verifyPaymentSignature(params: VerifySignatureRequest): boolean {
    const body = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');
    return expectedSignature === params.signature;
  }

  public async fetchPaymentStatus(paymentId: string): Promise<FetchPaymentResponse> {
    return {
      gatewayPaymentId: paymentId,
      status: 'completed',
      amount: 10000,
      currency: 'INR',
      paymentMethod: 'razorpay',
      feeAmount: 200,
      taxAmount: 36,
      rawResponse: { id: paymentId, status: 'captured', method: 'upi' },
    };
  }

  public async initiateRefund(params: RefundRequest): Promise<RefundResponse> {
    return {
      refundId: `rfnd_${Math.random().toString(36).substring(2, 12)}`,
      paymentId: params.paymentId,
      amount: params.amount || 0,
      status: 'completed',
    };
  }

  public async processWebhookPayload(
    rawBody: string,
    signature: string
  ): Promise<WebhookEventPayload> {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isValid = expectedSignature === signature;
    const parsed = JSON.parse(rawBody || '{}');
    const paymentEntity = parsed?.payload?.payment?.entity || {};

    return {
      eventId: parsed?.event_id || `evt_${Date.now()}`,
      eventType: parsed?.event || 'payment.captured',
      gatewayPaymentId: paymentEntity?.id || 'mock_pay_id',
      gatewayOrderId: paymentEntity?.order_id,
      amount: (paymentEntity?.amount || 0) / 100,
      currency: paymentEntity?.currency || 'INR',
      status: isValid && parsed?.event === 'payment.captured' ? 'completed' : 'failed',
      signatureVerified: isValid,
      metadata: parsed?.payload,
    };
  }
}
