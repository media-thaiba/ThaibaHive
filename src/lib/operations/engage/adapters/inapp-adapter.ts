import { ChannelAdapter } from './channel-adapter';
import { ChannelType, OutboundDispatchPayload, DispatchResult, DEFAULT_CHANNEL_COSTS } from '../engage-types';

export class InAppAdapter implements ChannelAdapter {
  public readonly channel: ChannelType = 'inapp';
  public readonly providerName: string;

  constructor(providerName = 'redis-pubsub-sse') {
    this.providerName = providerName;
  }

  public async send(payload: OutboundDispatchPayload): Promise<DispatchResult> {
    const deliveryId = `deliv_inapp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    if (!payload.recipientId) {
      return {
        success: false,
        deliveryId,
        messageId: payload.messageId,
        channel: 'inapp',
        provider: this.providerName,
        status: 'failed',
        failureReason: `Missing recipientId for in-app broadcast`,
        costUsd: 0,
        dispatchedAt: now,
      };
    }

    const providerMessageId = `sse_evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    return {
      success: true,
      deliveryId,
      messageId: payload.messageId,
      channel: 'inapp',
      provider: this.providerName,
      providerMessageId,
      status: 'delivered',
      costUsd: DEFAULT_CHANNEL_COSTS.inapp,
      dispatchedAt: now,
    };
  }

  public async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    return { healthy: true, latencyMs: 3 };
  }
}
