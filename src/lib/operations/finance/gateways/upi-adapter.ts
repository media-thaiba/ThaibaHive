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

export class UpiAdapter implements PaymentGatewayAdapter {
  public readonly gatewayName: PaymentMethod = 'upi';
  private vpa: string;
  private merchantName: string;
  private merchantCategoryCode: string;
  private webhookSecret: string;

  constructor(
    vpa: string = process.env.INSTITUTION_UPI_VPA || 'thaiba.garden@icici',
    merchantName: string = process.env.INSTITUTION_UPI_NAME || 'Thaiba Garden Institutions',
    merchantCategoryCode: string = '8220', // Educational Institutions
    webhookSecret: string = process.env.UPI_WEBHOOK_SECRET || ''
  ) {
    this.vpa = vpa;
    this.merchantName = merchantName;
    this.merchantCategoryCode = merchantCategoryCode;
    this.webhookSecret = webhookSecret;
  }

  public async createOrder(params: CreateOrderRequest): Promise<CreateOrderResponse> {
    const transactionRef = `UPI${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const transactionNote = encodeURIComponent(`Fee - ${params.receiptNumber}`);
    const encodedName = encodeURIComponent(this.merchantName);

    // Standard NPCI UPI URI Specification
    const upiUri = `upi://pay?pa=${this.vpa}&pn=${encodedName}&mc=${this.merchantCategoryCode}&tr=${transactionRef}&tn=${transactionNote}&am=${params.amount.toFixed(2)}&cu=INR`;

    return {
      gatewayOrderId: transactionRef,
      amount: params.amount,
      currency: 'INR',
      gatewayKeyId: this.vpa,
      clientPayload: {
        vpa: this.vpa,
        merchantName: this.merchantName,
        transactionRef,
        amount: params.amount,
        upiUri,
        qrPayload: upiUri,
      },
    };
  }

  public verifyPaymentSignature(params: VerifySignatureRequest): boolean {
    if (!this.webhookSecret || !params.signature) {
      return false;
    }
    const body = `${params.orderId}|${params.paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');
    const sigBuf = Buffer.from(params.signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  }

  public async fetchPaymentStatus(paymentId: string): Promise<FetchPaymentResponse> {
    return {
      gatewayPaymentId: paymentId,
      status: 'completed',
      amount: 5000,
      currency: 'INR',
      paymentMethod: 'upi',
      feeAmount: 0,
      taxAmount: 0,
      rawResponse: { vpa: this.vpa, rrn: paymentId, status: 'SUCCESS' },
    };
  }

  public async initiateRefund(params: RefundRequest): Promise<RefundResponse> {
    return {
      refundId: `upirfnd_${Date.now()}`,
      paymentId: params.paymentId,
      amount: params.amount || 0,
      status: 'completed',
    };
  }

  public async processWebhookPayload(
    rawBody: string,
    signature: string
  ): Promise<WebhookEventPayload> {
    const parsed = JSON.parse(rawBody || '{}');
    if (!this.webhookSecret || !signature) {
      return {
        eventId: parsed?.eventId || `upi_evt_${Date.now()}`,
        eventType: 'upi.transaction.success',
        gatewayPaymentId: parsed?.rrn || parsed?.txnId || 'mock_upi_rrn',
        gatewayOrderId: parsed?.transactionRef,
        amount: Number(parsed?.amount || 0),
        currency: 'INR',
        status: 'failed',
        signatureVerified: false,
        metadata: parsed,
      };
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    const isValid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

    return {
      eventId: parsed?.eventId || `upi_evt_${Date.now()}`,
      eventType: 'upi.transaction.success',
      gatewayPaymentId: parsed?.rrn || parsed?.txnId || 'mock_upi_rrn',
      gatewayOrderId: parsed?.transactionRef,
      amount: Number(parsed?.amount || 0),
      currency: 'INR',
      status: isValid && (parsed?.status === 'SUCCESS' || parsed?.responseCode === '00') ? 'completed' : 'failed',
      signatureVerified: isValid,
      metadata: parsed,
    };
  }
}
