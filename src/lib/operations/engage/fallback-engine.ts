import { ChannelType, OutboundDispatchPayload, DispatchResult, MessagePriority } from './engage-types';
import { DispatchEngine } from './dispatch-engine';
import { EngageDbStore } from '../../db/engage-store';

export interface FallbackRouteMap {
  critical: ChannelType[];
  high: ChannelType[];
  standard: ChannelType[];
  low: ChannelType[];
}

export const DEFAULT_FALLBACK_ROUTES: FallbackRouteMap = {
  critical: ['voice', 'sms', 'push', 'email'],
  high: ['push', 'sms', 'email', 'inapp'],
  standard: ['inapp', 'email', 'push', 'sms'],
  low: ['inapp', 'email'],
};

export class FallbackEngine {
  private static instance: FallbackEngine;
  private dispatchEngine: DispatchEngine;
  private store: EngageDbStore;
  private readonly maxHops: number = 3;

  private constructor() {
    this.dispatchEngine = DispatchEngine.getInstance();
    this.store = EngageDbStore.getInstance();
  }

  public static getInstance(): FallbackEngine {
    if (!FallbackEngine.instance) {
      FallbackEngine.instance = new FallbackEngine();
    }
    return FallbackEngine.instance;
  }

  public getNextFallbackChannel(
    currentChannel: ChannelType,
    priority: MessagePriority = 'standard',
    attemptedChannels: ChannelType[] = []
  ): ChannelType | null {
    const routeHierarchy = DEFAULT_FALLBACK_ROUTES[priority] || DEFAULT_FALLBACK_ROUTES.standard;
    const currentIndex = routeHierarchy.indexOf(currentChannel);

    for (let i = 0; i < routeHierarchy.length; i++) {
      const candidate = routeHierarchy[i];
      if (candidate !== currentChannel && !attemptedChannels.includes(candidate)) {
        if (currentIndex === -1 || i > currentIndex) {
          return candidate;
        }
      }
    }

    return null;
  }

  public async executeFallbackCascade(
    originalPayload: OutboundDispatchPayload,
    failedResult: DispatchResult,
    alternateAddresses?: Partial<Record<ChannelType, string>>,
    attemptedChannels: ChannelType[] = [failedResult.channel]
  ): Promise<DispatchResult> {
    if (attemptedChannels.length >= this.maxHops) {
      return {
        ...failedResult,
        success: false,
        failureReason: `Max fallback hop limit reached (${this.maxHops}). Channels tried: ${attemptedChannels.join(', ')}`,
        fallbackTriggered: false,
      };
    }

    const nextChannel = this.getNextFallbackChannel(
      failedResult.channel,
      originalPayload.priority || 'standard',
      attemptedChannels
    );

    if (!nextChannel) {
      return {
        ...failedResult,
        success: false,
        failureReason: `No further fallback channels available. Exhausted: ${attemptedChannels.join(', ')}`,
        fallbackTriggered: false,
      };
    }

    // Determine target recipient address for the fallback channel
    let fallbackAddress = originalPayload.recipientChannelAddress;
    if (alternateAddresses && alternateAddresses[nextChannel]) {
      fallbackAddress = alternateAddresses[nextChannel]!;
    }

    const fallbackPayload: OutboundDispatchPayload = {
      ...originalPayload,
      messageId: `${originalPayload.messageId}_fb_${nextChannel}`,
      channel: nextChannel,
      recipientChannelAddress: fallbackAddress,
      metadata: {
        ...(originalPayload.metadata || {}),
        isFallback: true,
        previousChannel: failedResult.channel,
        previousFailure: failedResult.failureReason,
        fallbackHopCount: attemptedChannels.length + 1,
      },
    };

    const newResult = await this.dispatchEngine.dispatchMessage(fallbackPayload);

    return {
      ...newResult,
      fallbackTriggered: true,
    };
  }
}
