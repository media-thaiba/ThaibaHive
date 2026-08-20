import { ChannelType, MessagePriority } from '../engage-types';
import { EngageDbStore } from '../../../db/engage-store';

export interface ConsentValidationResult {
  hasConsent: boolean;
  reason?: string;
  isEmergencyOverride: boolean;
}

export class ConsentManager {
  private static instance: ConsentManager;
  private store: EngageDbStore;

  private constructor() {
    this.store = EngageDbStore.getInstance();
  }

  public static getInstance(): ConsentManager {
    if (!ConsentManager.instance) {
      ConsentManager.instance = new ConsentManager();
    }
    return ConsentManager.instance;
  }

  public async validateDispatchConsent(
    recipientId: string,
    channel: ChannelType,
    category = 'general',
    priority: MessagePriority = 'standard',
    institutionId = 'global'
  ): Promise<ConsentValidationResult> {
    // Critical priority emergency communications (safety/weather/lockdown) override opt-outs by law
    if (priority === 'critical') {
      return {
        hasConsent: true,
        isEmergencyOverride: true,
        reason: 'Emergency safety broadcast bypass applied per institutional safety protocol',
      };
    }

    const preferences = await this.store.getPreferencesAsync(recipientId, institutionId);

    if (!preferences) {
      // Default: opt-in for essential channels (email, inapp), opt-in for transactional
      return {
        hasConsent: true,
        isEmergencyOverride: false,
      };
    }

    if (preferences.isUnsubscribedAll) {
      return {
        hasConsent: false,
        isEmergencyOverride: false,
        reason: `Recipient has globally unsubscribed from all institutional communications`,
      };
    }

    try {
      const channelPrefs = JSON.parse(preferences.channelPreferences || '{}');
      if (channelPrefs[channel] === false) {
        return {
          hasConsent: false,
          isEmergencyOverride: false,
          reason: `Recipient opted out of channel: ${channel.toUpperCase()}`,
        };
      }

      const categorySubs = JSON.parse(preferences.categorySubscriptions || '{}');
      if (categorySubs[category] === false) {
        return {
          hasConsent: false,
          isEmergencyOverride: false,
          reason: `Recipient opted out of category: ${category}`,
        };
      }
    } catch {
      // Default to allowed
    }

    return {
      hasConsent: true,
      isEmergencyOverride: false,
    };
  }
}
