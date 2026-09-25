import { PaymentMethod, PaymentStatus } from '../types';

export interface CreateOrderRequest {
  orderId: string;
  amount: number; // In currency units (e.g. INR / USD)
  currency: string;
  receiptNumber: string;
  notes?: Record<string, string>;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface CreateOrderResponse {
  gatewayOrderId: string;
  amount: number;
  currency: string;
  gatewayKeyId: string;
  clientPayload: Record<string, any>;
}

export interface VerifySignatureRequest {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface FetchPaymentResponse {
  gatewayPaymentId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  feeAmount?: number;
  taxAmount?: number;
  rawResponse?: Record<string, any>;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number; // Full refund if omitted
  reason?: string;
}

export interface RefundResponse {
  refundId: string;
  paymentId: string;
  amount: number;
  status: 'initiated' | 'completed' | 'failed';
}

export interface WebhookEventPayload {
  eventId: string;
  eventType: string; // 'payment.captured' | 'payment_intent.succeeded' | etc.
  gatewayPaymentId: string;
  gatewayOrderId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  signatureVerified: boolean;
  metadata?: Record<string, any>;
}

export interface PaymentGatewayAdapter {
  readonly gatewayName: PaymentMethod;
  createOrder(params: CreateOrderRequest): Promise<CreateOrderResponse>;
  verifyPaymentSignature(params: VerifySignatureRequest): boolean;
  fetchPaymentStatus(paymentId: string): Promise<FetchPaymentResponse>;
  initiateRefund(params: RefundRequest): Promise<RefundResponse>;
  processWebhookPayload(rawBody: string, signature: string, headers?: Record<string, string>): Promise<WebhookEventPayload>;
}
