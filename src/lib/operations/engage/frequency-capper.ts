import { EngageDbStore } from '../../db/engage-store';
import { MessagePriority, ChannelType } from './engage-types';

export interface FrequencyCapCheckResult {
  allowed: boolean;
  reason?: string;
  dispatchesInWindow: number;
  maxAllowedInWindow: number;
}

export class FrequencyCapper {
  private static instance: FrequencyCapper;
  private store: EngageDbStore;

  // Max messages allowed in a 24-hour window per channel for non-critical priority
  private readonly defaultDailyLimits: Record<ChannelType, number> = {
    sms: 2,
    email: 4,
    push: 6,
    inapp: 20,
    voice: 1,
  };

  private constructor() {
    this.store = EngageDbStore.getInstance();
  }

  public static getInstance(): FrequencyCapper {
    if (!FrequencyCapper.instance) {
      FrequencyCapper.instance = new FrequencyCapper();
    }
    return FrequencyCapper.instance;
  }

  public async checkFrequencyCap(
    recipientId: string,
    channel: ChannelType,
    priority: MessagePriority = 'standard',
    institutionId = 'global'
  ): Promise<FrequencyCapCheckResult> {
    // Critical priority emergency messages bypass all frequency caps
    if (priority === 'critical') {
      return {
        allowed: true,
        dispatchesInWindow: 0,
        maxAllowedInWindow: Infinity,
      };
    }

    const maxAllowed = this.defaultDailyLimits[channel] || 5;

    // Count messages sent to recipient on this channel in past 24 hours
    const allMessages = await this.store.listMessagesAsync(institutionId, 100);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const recentCount = allMessages.filter((msg) => {
      const isRecipient = msg.recipientId === recipientId;
      const isChannel = msg.channel === channel;
      const isRecent = new Date(msg.createdAt).getTime() > oneDayAgo;
      const isNonCritical = msg.priority !== 'critical';
      return isRecipient && isChannel && isRecent && isNonCritical;
    }).length;

    if (recentCount >= maxAllowed) {
      return {
        allowed: false,
        reason: `Frequency cap exceeded for channel ${channel.toUpperCase()} (${recentCount}/${maxAllowed} in 24h)`,
        dispatchesInWindow: recentCount,
        maxAllowedInWindow: maxAllowed,
      };
    }

    return {
      allowed: true,
      dispatchesInWindow: recentCount,
      maxAllowedInWindow: maxAllowed,
    };
  }
}
