import { ChannelAdapter } from './channel-adapter';
import { ChannelType, OutboundDispatchPayload, DispatchResult, DEFAULT_CHANNEL_COSTS } from '../engage-types';

export class VoiceAdapter implements ChannelAdapter {
  public readonly channel: ChannelType = 'voice';
  public readonly providerName: string;

  constructor(providerName = 'twilio-voice') {
    this.providerName = providerName;
  }

  public async send(payload: OutboundDispatchPayload): Promise<DispatchResult> {
    const deliveryId = `deliv_voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    const phoneDigits = payload.recipientChannelAddress.replace(/[^\d+]/g, '');
    if (phoneDigits.length < 7) {
      return {
        success: false,
        deliveryId,
        messageId: payload.messageId,
        channel: 'voice',
        provider: this.providerName,
        status: 'failed',
        failureReason: `Invalid destination phone number for IVR call: ${payload.recipientChannelAddress}`,
        costUsd: 0,
        dispatchedAt: now,
      };
    }

    const providerMessageId = `tw_call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    return {
      success: true,
      deliveryId,
      messageId: payload.messageId,
      channel: 'voice',
      provider: this.providerName,
      providerMessageId,
      status: 'sent',
      costUsd: DEFAULT_CHANNEL_COSTS.voice,
      dispatchedAt: now,
    };
  }

  public async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    return { healthy: true, latencyMs: 30 };
  }
}
