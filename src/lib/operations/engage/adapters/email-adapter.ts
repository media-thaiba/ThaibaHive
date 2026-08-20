import { ChannelAdapter } from './channel-adapter';
import { ChannelType, OutboundDispatchPayload, DispatchResult, DEFAULT_CHANNEL_COSTS } from '../engage-types';

export class EmailAdapter implements ChannelAdapter {
  public readonly channel: ChannelType = 'email';
  public readonly providerName: string;

  constructor(providerName = 'aws-ses') {
    this.providerName = providerName;
  }

  public async send(payload: OutboundDispatchPayload): Promise<DispatchResult> {
    const deliveryId = `deliv_email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.recipientChannelAddress)) {
      return {
        success: false,
        deliveryId,
        messageId: payload.messageId,
        channel: 'email',
        provider: this.providerName,
        status: 'failed',
        failureReason: `Invalid email address format: ${payload.recipientChannelAddress}`,
        costUsd: 0,
        dispatchedAt: now,
      };
    }

    const providerMessageId = `ses_msg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    return {
      success: true,
      deliveryId,
      messageId: payload.messageId,
      channel: 'email',
      provider: this.providerName,
      providerMessageId,
      status: 'sent',
      costUsd: DEFAULT_CHANNEL_COSTS.email,
      dispatchedAt: now,
    };
  }

  public async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    return { healthy: true, latencyMs: 12 };
  }
}
