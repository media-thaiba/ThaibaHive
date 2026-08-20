import { ChannelAdapter } from './channel-adapter';
import { ChannelType, OutboundDispatchPayload, DispatchResult, DEFAULT_CHANNEL_COSTS } from '../engage-types';

export class PushAdapter implements ChannelAdapter {
  public readonly channel: ChannelType = 'push';
  public readonly providerName: string;

  constructor(providerName = 'firebase-fcm') {
    this.providerName = providerName;
  }

  public async send(payload: OutboundDispatchPayload): Promise<DispatchResult> {
    const deliveryId = `deliv_push_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    if (!payload.recipientChannelAddress || payload.recipientChannelAddress.trim().length < 5) {
      return {
        success: false,
        deliveryId,
        messageId: payload.messageId,
        channel: 'push',
        provider: this.providerName,
        status: 'failed',
        failureReason: `Invalid or missing device push registration token`,
        costUsd: 0,
        dispatchedAt: now,
      };
    }

    const providerMessageId = `fcm_msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    return {
      success: true,
      deliveryId,
      messageId: payload.messageId,
      channel: 'push',
      provider: this.providerName,
      providerMessageId,
      status: 'delivered',
      costUsd: DEFAULT_CHANNEL_COSTS.push,
      dispatchedAt: now,
    };
  }

  public async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    return { healthy: true, latencyMs: 18 };
  }
}
