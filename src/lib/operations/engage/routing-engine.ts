import { ChannelType, MessagePriority, DEFAULT_CHANNEL_COSTS } from './engage-types';
import { EngageDbStore } from '../../db/engage-store';

export interface RoutingContext {
  recipientId: string;
  priority: MessagePriority;
  category?: string; // 'academic', 'financial', 'operational', 'general'
  institutionId?: string;
  availableChannels?: ChannelType[];
  enforceBudgetCap?: boolean;
}

export interface RoutingDecision {
  selectedChannel: ChannelType;
  channelScores: Record<ChannelType, number>;
  urgencyWeight: number;
  costEstimateUsd: number;
  rationale: string;
}

export class RoutingEngine {
  private static instance: RoutingEngine;
  private store: EngageDbStore;

  // Channel provider baseline reliabilities
  private readonly reliabilityScores: Record<ChannelType, number> = {
    voice: 0.98,
    sms: 0.99,
    push: 0.92,
    inapp: 0.99,
    email: 0.96,
  };

  private constructor() {
    this.store = EngageDbStore.getInstance();
  }

  public static getInstance(): RoutingEngine {
    if (!RoutingEngine.instance) {
      RoutingEngine.instance = new RoutingEngine();
    }
    return RoutingEngine.instance;
  }

  public async determineOptimalChannel(context: RoutingContext): Promise<RoutingDecision> {
    const institutionId = context.institutionId || 'global';
    const channels: ChannelType[] = context.availableChannels || ['inapp', 'email', 'push', 'sms', 'voice'];

    // 1. Fetch recipient preferences
    const preferences = await this.store.getPreferencesAsync(context.recipientId, institutionId);
    let channelPrefs: Record<string, boolean> = { email: true, inapp: true, push: true, sms: true, voice: true };
    let isUnsubscribed = false;

    if (preferences) {
      isUnsubscribed = Boolean(preferences.isUnsubscribedAll);
      try {
        const parsed = JSON.parse(preferences.channelPreferences || '{}');
        channelPrefs = { ...channelPrefs, ...parsed };
      } catch {
        // Default to true
      }
    }

    // 2. Compute Urgency weight
    let urgencyFactor = 0.4;
    if (context.priority === 'critical') urgencyFactor = 1.0;
    else if (context.priority === 'high') urgencyFactor = 0.75;
    else if (context.priority === 'low') urgencyFactor = 0.1;

    // Weights: w1 (urgency), w2 (preference), w3 (reliability), w4 (cost penalty)
    const wUrgency = 0.35;
    const wPref = 0.25;
    const wRel = 0.25;
    const wCost = 0.15;

    const channelScores: Record<ChannelType, number> = {
      email: 0,
      sms: 0,
      push: 0,
      inapp: 0,
      voice: 0,
    };

    // For critical alerts, emergency broadcast always overrides general opt-outs
    for (const ch of channels) {
      // Check opt-out
      if (!channelPrefs[ch] && context.priority !== 'critical') {
        channelScores[ch] = -100;
        continue;
      }
      if (isUnsubscribed && context.priority !== 'critical') {
        channelScores[ch] = -100;
        continue;
      }

      const prefScore = channelPrefs[ch] ? 1.0 : 0.0;
      const relScore = this.reliabilityScores[ch] || 0.9;
      const cost = DEFAULT_CHANNEL_COSTS[ch];
      const normalizedCostPenalty = Math.min(cost * 50, 1.0); // scale cost penalty

      // Speed / Intrusiveness alignment with urgency
      let channelUrgencyAffinity = 0.5;
      if (ch === 'voice') channelUrgencyAffinity = context.priority === 'critical' ? 1.0 : 0.05;
      else if (ch === 'sms') channelUrgencyAffinity = (context.priority === 'critical' || context.priority === 'high') ? 0.9 : 0.3;
      else if (ch === 'push') channelUrgencyAffinity = 0.7;
      else if (ch === 'inapp') channelUrgencyAffinity = context.priority === 'low' ? 0.9 : 0.5;
      else if (ch === 'email') channelUrgencyAffinity = (context.priority === 'standard' || context.priority === 'low') ? 0.8 : 0.4;

      const score =
        wUrgency * (urgencyFactor * channelUrgencyAffinity * 2) +
        wPref * prefScore +
        wRel * relScore -
        wCost * normalizedCostPenalty;

      channelScores[ch] = parseFloat(score.toFixed(4));
    }

    // Pick channel with max score
    let selectedChannel: ChannelType = 'email';
    let maxScore = -999;

    for (const ch of channels) {
      if (channelScores[ch] > maxScore) {
        maxScore = channelScores[ch];
        selectedChannel = ch;
      }
    }

    const costEstimateUsd = DEFAULT_CHANNEL_COSTS[selectedChannel];
    const rationale = `Selected ${selectedChannel.toUpperCase()} with multi-factor score ${maxScore.toFixed(2)} (priority: ${context.priority}, cost: $${costEstimateUsd.toFixed(4)})`;

    return {
      selectedChannel,
      channelScores,
      urgencyWeight: urgencyFactor,
      costEstimateUsd,
      rationale,
    };
  }
}
