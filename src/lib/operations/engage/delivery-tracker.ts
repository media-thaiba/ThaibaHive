import { EngageDbStore } from '../../db/engage-store';
import { DeliveryStatus } from './engage-types';

export interface DeliveryStatusUpdate {
  deliveryId: string;
  status: DeliveryStatus;
  providerMessageId?: string;
  failureReason?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  institutionId?: string;
}

export class DeliveryTracker {
  private static instance: DeliveryTracker;
  private store: EngageDbStore;

  private constructor() {
    this.store = EngageDbStore.getInstance();
  }

  public static getInstance(): DeliveryTracker {
    if (!DeliveryTracker.instance) {
      DeliveryTracker.instance = new DeliveryTracker();
    }
    return DeliveryTracker.instance;
  }

  public async updateDeliveryStatus(update: DeliveryStatusUpdate): Promise<boolean> {
    const institutionId = update.institutionId || 'global';
    const delivery = await this.store.getDeliveryAsync(update.deliveryId, institutionId);

    if (!delivery) {
      return false;
    }

    const now = new Date().toISOString();
    const updatedRecord = {
      ...delivery,
      status: update.status,
      providerMessageId: update.providerMessageId || delivery.providerMessageId,
      failureReason: update.failureReason || delivery.failureReason,
      deliveredAt: update.deliveredAt || (update.status === 'delivered' ? now : delivery.deliveredAt),
      openedAt: update.openedAt || (update.status === 'opened' ? now : delivery.openedAt),
      clickedAt: update.clickedAt || (update.status === 'clicked' ? now : delivery.clickedAt),
      institutionId,
    };

    await this.store.saveDeliveryAsync(updatedRecord);

    // Record corresponding analytics event
    await this.store.recordAnalyticsEventAsync({
      eventId: `evt_dlr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      deliveryId: update.deliveryId,
      messageId: delivery.messageId,
      eventType: update.status,
      channel: delivery.channel,
      metadata: {
        providerMessageId: update.providerMessageId,
        failureReason: update.failureReason,
      },
      institutionId,
      timestamp: now,
    });

    return true;
  }

  public async isDeliveryTimedOut(deliveryId: string, timeoutMinutes = 5, institutionId = 'global'): Promise<boolean> {
    const delivery = await this.store.getDeliveryAsync(deliveryId, institutionId);
    if (!delivery) return false;

    if (delivery.status === 'delivered' || delivery.status === 'opened' || delivery.status === 'clicked') {
      return false;
    }

    const dispatchedTime = new Date(delivery.dispatchedAt).getTime();
    const elapsedMinutes = (Date.now() - dispatchedTime) / (1000 * 60);

    return elapsedMinutes > timeoutMinutes;
  }

  public async handleProviderWebhook(provider: string, payload: any): Promise<{ received: boolean; status?: string }> {
    const deliveryId = payload.deliveryId || payload.MessageId || payload.id || `dlv_${Date.now()}`;
    const rawStatus = (payload.status || payload.eventType || payload.MessageStatus || 'delivered').toLowerCase();
    
    let status: DeliveryStatus = 'delivered';
    if (rawStatus.includes('fail') || rawStatus.includes('undelivered') || rawStatus.includes('bounc')) {
      status = 'failed';
    } else if (rawStatus.includes('open')) {
      status = 'opened';
    } else if (rawStatus.includes('click')) {
      status = 'clicked';
    }

    await this.updateDeliveryStatus({
      deliveryId,
      status,
      providerMessageId: payload.providerMessageId || payload.SmsSid || payload.MessageId,
      failureReason: payload.errorMessage || payload.reason,
    });

    return { received: true, status };
  }
}
