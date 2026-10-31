import crypto from 'crypto';
import { GatewayAdapterFactory } from './gateway-adapter-factory';
import { DLQManager } from './dlq-manager';
import { FeeDbStore } from '../../../../db/fee-store';
import { PaymentMethod, PaymentStatus } from '../types';
import { db } from '@/db';
import { feeAuditLogs } from '@thaiba/db/schema';

export interface WebhookProcessResult {
  success: boolean;
  isDuplicate: boolean;
  idempotencyKey: string;
  gatewayPaymentId?: string;
  status?: PaymentStatus;
  message: string;
  error?: string;
}

export class WebhookProcessor {
  private static instance: WebhookProcessor;
  private factory: GatewayAdapterFactory;
  private dlq: DLQManager;
  private store: FeeDbStore;

  constructor(
    factory?: GatewayAdapterFactory,
    dlq?: DLQManager,
    store?: FeeDbStore
  ) {
    this.factory = factory || GatewayAdapterFactory.getInstance();
    this.dlq = dlq || DLQManager.getInstance();
    this.store = store || FeeDbStore.getInstance();
  }

  public static getInstance(): WebhookProcessor {
    if (!WebhookProcessor.instance) {
      WebhookProcessor.instance = new WebhookProcessor();
    }
    return WebhookProcessor.instance;
  }

  /**
   * Generates a cryptographic SHA-256 idempotency key for the webhook event
   */
  public generateIdempotencyKey(
    gatewayName: PaymentMethod,
    eventId: string,
    paymentId?: string
  ): string {
    const raw = `${gatewayName}:${eventId}:${paymentId || 'none'}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Processes incoming gateway webhook payload with idempotency deduplication and DLQ buffering
   */
  public async handleWebhook(
    gatewayName: PaymentMethod,
    rawBody: string,
    signatureHeader: string,
    headers?: Record<string, string>
  ): Promise<WebhookProcessResult> {
    const adapter = this.factory.getAdapter(gatewayName);

    try {
      const webhookEvent = await adapter.processWebhookPayload(rawBody, signatureHeader, headers);

      if (!webhookEvent.signatureVerified) {
        await this.dlq.enqueue(gatewayName, rawBody, signatureHeader, 'Invalid HMAC Signature', headers);
        return {
          success: false,
          isDuplicate: false,
          idempotencyKey: '',
          message: 'Webhook signature verification failed',
          error: 'INVALID_SIGNATURE',
        };
      }

      const key = this.generateIdempotencyKey(
        gatewayName,
        webhookEvent.eventId,
        webhookEvent.gatewayPaymentId
      );

      // Check idempotency against the database (survives restarts/scale-out)
      const alreadyProcessed = await this.store.isWebhookProcessed(key);
      if (alreadyProcessed) {
        return {
          success: true,
          isDuplicate: true,
          idempotencyKey: key,
          gatewayPaymentId: webhookEvent.gatewayPaymentId,
          status: webhookEvent.status,
          message: 'Duplicate event acknowledged idempotently',
        };
      }

      // Transition payment record if exists. Query the database directly —
      // never iterate the in-memory Map (which is empty on a cold worker).
      if (webhookEvent.gatewayOrderId) {
        const payment = await this.store.getPaymentByGatewayRef(
          webhookEvent.gatewayOrderId,
          undefined
        );
        if (payment) {
          const wasCompleted = payment.paymentStatus === 'completed';
          const updated = await this.store.updatePaymentStatus(payment.id, {
            paymentStatus: webhookEvent.status,
            gatewayPaymentId: webhookEvent.gatewayPaymentId,
            updatedAt: new Date().toISOString(),
          });
          if (webhookEvent.status === 'completed' && !wasCompleted && updated) {
            await this.store.applyPaymentToAllocation(updated);
          }
        }
      }

      // Mark processed AFTER successful handling so failures trigger DLQ retry
      await this.store.markWebhookProcessed(key, gatewayName, webhookEvent.eventId);

      return {
        success: true,
        isDuplicate: false,
        idempotencyKey: key,
        gatewayPaymentId: webhookEvent.gatewayPaymentId,
        status: webhookEvent.status,
        message: 'Webhook processed successfully',
      };
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : 'Processing exception';
      await this.dlq.enqueue(gatewayName, rawBody, signatureHeader, errMessage, headers);
      return {
        success: false,
        isDuplicate: false,
        idempotencyKey: '',
        message: 'Internal error processing webhook',
        error: errMessage,
      };
    }
  }

  /**
   * Replays dead-letter queue events
   */
  public async retryDLQEvents(): Promise<{ totalReplayed: number; successCount: number }> {
    const pending = await this.dlq.listPendingEvents();
    let successCount = 0;

    for (const item of pending) {
      const replayed = await this.dlq.replayEvent(item.id, async (evt) => {
        const res = await this.handleWebhook(
          evt.gatewayName as PaymentMethod,
          evt.rawBody,
          evt.signature,
          evt.headers
        );
        return res.success;
      });
      if (replayed) successCount++;
    }

    return { totalReplayed: pending.length, successCount };
  }
}
