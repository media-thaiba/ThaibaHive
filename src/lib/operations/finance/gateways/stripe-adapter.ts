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

export class StripeAdapter implements PaymentGatewayAdapter {
  public readonly gatewayName: PaymentMethod = 'stripe';
  private publishableKey: string;
  private secretKey: string;
  private webhookSecret: string;

  constructor(
    publishableKey: string = process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_thaiba_mock_key',
    secretKey: string = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_secret',
    webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_secret'
  ) {
    this.publishableKey = publishableKey;
    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret;
  }

  public async createOrder(params: CreateOrderRequest): Promise<CreateOrderResponse> {
    const amountInCents = Math.round(params.amount * 100);
    const mockIntentId = `pi_${Math.random().toString(36).substring(2, 16)}`;
    const mockClientSecret = `${mockIntentId}_secret_${Math.random().toString(36).substring(2, 10)}`;

    return {
      gatewayOrderId: mockIntentId,
      amount: params.amount,
      currency: (params.currency || 'USD').toLowerCase(),
      gatewayKeyId: this.publishableKey,
      clientPayload: {
        publishableKey: this.publishableKey,
        clientSecret: mockClientSecret,
        paymentIntentId: mockIntentId,
        amount: amountInCents,
        currency: (params.currency || 'USD').toLowerCase(),
        receiptEmail: params.customerEmail,
      },
    };
  }

  public verifyPaymentSignature(params: VerifySignatureRequest): boolean {
    return params.signature.startsWith('pi_') || params.signature.startsWith('ch_') || params.signature.length >= 10;
  }

  public async fetchPaymentStatus(paymentId: string): Promise<FetchPaymentResponse> {
    return {
      gatewayPaymentId: paymentId,
      status: 'completed',
      amount: 1000,
      currency: 'USD',
      paymentMethod: 'stripe',
      feeAmount: 30,
      taxAmount: 0,
      rawResponse: { id: paymentId, status: 'succeeded' },
    };
  }

  public async initiateRefund(params: RefundRequest): Promise<RefundResponse> {
    return {
      refundId: `re_${Math.random().toString(36).substring(2, 14)}`,
      paymentId: params.paymentId,
      amount: params.amount || 0,
      status: 'completed',
    };
  }

  public async processWebhookPayload(
    rawBody: string,
    signatureHeader: string
  ): Promise<WebhookEventPayload> {
    // Parse stripe-signature header: t=1612345678,v1=signature_hash
    let timestamp = '';
    let signature = '';

    if (signatureHeader) {
      const parts = signatureHeader.split(',');
      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k === 't') timestamp = v;
        if (k === 'v1') signature = v;
      }
    }

    let isValid = false;
    if (timestamp && signature) {
      const signedPayload = `${timestamp}.${rawBody}`;
      const expected = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signedPayload)
        .digest('hex');
      isValid = expected === signature;
    } else {
      // Fallback direct body verification
      const expected = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(rawBody)
        .digest('hex');
      isValid = expected === signatureHeader;
    }

    const parsed = JSON.parse(rawBody || '{}');
    const dataObj = parsed?.data?.object || {};

    return {
      eventId: parsed?.id || `evt_${Date.now()}`,
      eventType: parsed?.type || 'payment_intent.succeeded',
      gatewayPaymentId: dataObj?.id || 'mock_pi_id',
      gatewayOrderId: dataObj?.id,
      amount: (dataObj?.amount || 0) / 100,
      currency: (dataObj?.currency || 'USD').toUpperCase(),
      status: isValid && parsed?.type === 'payment_intent.succeeded' ? 'completed' : 'failed',
      signatureVerified: isValid,
      metadata: dataObj?.metadata,
    };
  }
}
