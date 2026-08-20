import { ChannelAdapter } from './adapters/channel-adapter';
import { EmailAdapter } from './adapters/email-adapter';
import { SmsAdapter } from './adapters/sms-adapter';
import { PushAdapter } from './adapters/push-adapter';
import { InAppAdapter } from './adapters/inapp-adapter';
import { VoiceAdapter } from './adapters/voice-adapter';
import { ChannelType, OutboundDispatchPayload, DispatchResult } from './engage-types';
import { EngageDbStore } from '../../db/engage-store';

export class DispatchEngine {
  private static instance: DispatchEngine;
  private adapters: Map<ChannelType, ChannelAdapter> = new Map();
  private store: EngageDbStore;

  private constructor() {
    this.store = EngageDbStore.getInstance();
    this.registerAdapter(new EmailAdapter());
    this.registerAdapter(new SmsAdapter());
    this.registerAdapter(new PushAdapter());
    this.registerAdapter(new InAppAdapter());
    this.registerAdapter(new VoiceAdapter());
  }

  public static getInstance(): DispatchEngine {
    if (!DispatchEngine.instance) {
      DispatchEngine.instance = new DispatchEngine();
    }
    return DispatchEngine.instance;
  }

  public registerAdapter(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.channel, adapter);
  }

  public getAdapter(channel: ChannelType): ChannelAdapter | undefined {
    return this.adapters.get(channel);
  }

  public async dispatchMessage(payload: OutboundDispatchPayload): Promise<DispatchResult> {
    const targetChannel = payload.channel;
    const adapter = this.adapters.get(targetChannel);

    const institutionId = payload.institutionId || 'global';

    if (!adapter) {
      const deliveryId = `deliv_unsupported_${Date.now()}`;
      const result: DispatchResult = {
        success: false,
        deliveryId,
        messageId: payload.messageId,
        channel: targetChannel,
        provider: 'none',
        status: 'failed',
        failureReason: `No channel adapter registered for channel: ${targetChannel}`,
        costUsd: 0,
        dispatchedAt: new Date().toISOString(),
      };

      await this.store.saveMessageAsync({
        messageId: payload.messageId,
        campaignId: payload.campaignId,
        templateId: payload.templateId,
        recipientId: payload.recipientId,
        recipientType: payload.recipientType,
        recipientChannelAddress: payload.recipientChannelAddress,
        channel: payload.channel,
        priority: payload.priority,
        status: 'failed',
        subject: payload.subject,
        body: payload.body,
        personalizedData: payload.personalizedData,
        institutionId,
      });

      await this.store.saveDeliveryAsync({
        deliveryId: result.deliveryId,
        messageId: result.messageId,
        channel: result.channel,
        provider: result.provider,
        status: result.status,
        failureReason: result.failureReason,
        costUsd: result.costUsd,
        institutionId,
      });

      return result;
    }

    // Save initial message state
    await this.store.saveMessageAsync({
      messageId: payload.messageId,
      campaignId: payload.campaignId,
      templateId: payload.templateId,
      recipientId: payload.recipientId,
      recipientType: payload.recipientType,
      recipientChannelAddress: payload.recipientChannelAddress,
      channel: payload.channel,
      priority: payload.priority,
      status: 'queued',
      subject: payload.subject,
      body: payload.body,
      personalizedData: payload.personalizedData,
      institutionId,
    });

    // Execute adapter send
    const result = await adapter.send(payload);

    // Update message and save delivery record
    await this.store.saveMessageAsync({
      messageId: payload.messageId,
      status: result.success ? 'sent' : 'failed',
      institutionId,
    });

    await this.store.saveDeliveryAsync({
      deliveryId: result.deliveryId,
      messageId: result.messageId,
      channel: result.channel,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      status: result.status,
      failureReason: result.failureReason,
      costUsd: result.costUsd,
      dispatchedAt: result.dispatchedAt,
      deliveredAt: result.status === 'delivered' ? result.dispatchedAt : null,
      institutionId,
    });

    return result;
  }
}
