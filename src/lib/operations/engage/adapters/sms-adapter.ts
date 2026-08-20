import { ChannelAdapter } from './channel-adapter';
import { ChannelType, OutboundDispatchPayload, DispatchResult, DEFAULT_CHANNEL_COSTS } from '../engage-types';

export class SmsAdapter implements ChannelAdapter {
  public readonly channel: ChannelType = 'sms';
  public readonly providerName: string;

  constructor(providerName = 'twilio-sms') {
    this.providerName = providerName;
  }

  public async send(payload: OutboundDispatchPayload): Promise<DispatchResult> {
    const deliveryId = `deliv_sms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    // Basic phone number format check (+ or digits, min 7 digits)
    const phoneDigits = payload.recipientChannelAddress.replace(/[^\d+]/g, '');
    if (phoneDigits.length < 7) {
      return {
        success: false,
        deliveryId,
        messageId: payload.messageId,
        channel: 'sms',
        provider: this.providerName,
        status: 'failed',
        failureReason: `Invalid destination phone number: ${payload.recipientChannelAddress}`,
        costUsd: 0,
        dispatchedAt: now,
      };
    }

    const providerMessageId = `tw_sms_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    return {
      success: true,
      deliveryId,
      messageId: payload.messageId,
      channel: 'sms',
      provider: this.providerName,
      providerMessageId,
      status: 'sent',
      costUsd: DEFAULT_CHANNEL_COSTS.sms,
      dispatchedAt: now,
    };
  }

  public async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    return { healthy: true, latencyMs: 25 };
  }
}
