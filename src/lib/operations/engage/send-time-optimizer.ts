import { EngageDbStore } from '../../db/engage-store';

export interface SendTimeOptimizationResult {
  optimalSendTime: string; // ISO string
  isDelayedForQuietHours: boolean;
  confidenceScore: number;
  reason: string;
}

export class SendTimeOptimizer {
  private static instance: SendTimeOptimizer;
  private store: EngageDbStore;

  private constructor() {
    this.store = EngageDbStore.getInstance();
  }

  public static getInstance(): SendTimeOptimizer {
    if (!SendTimeOptimizer.instance) {
      SendTimeOptimizer.instance = new SendTimeOptimizer();
    }
    return SendTimeOptimizer.instance;
  }

  public async computeOptimalSendTime(
    recipientId: string,
    targetDate: Date = new Date(),
    institutionId = 'global'
  ): Promise<SendTimeOptimizationResult> {
    const preferences = await this.store.getPreferencesAsync(recipientId, institutionId);

    const quietStart = preferences?.quietHoursStart || '21:00';
    const quietEnd = preferences?.quietHoursEnd || '07:00';

    const [startHour] = quietStart.split(':').map(Number);
    const [endHour, endMin = 0] = quietEnd.split(':').map(Number);

    const candidateDate = new Date(targetDate);
    const currentHour = candidateDate.getUTCHours();

    let isQuietHours = false;
    if (startHour > endHour) {
      // e.g. 21:00 to 07:00 next day
      isQuietHours = currentHour >= startHour || currentHour < endHour;
    } else {
      isQuietHours = currentHour >= startHour && currentHour < endHour;
    }

    if (isQuietHours) {
      // Postpone to end of quiet hours (e.g. 07:30 UTC)
      const adjustedDate = new Date(candidateDate);
      if (currentHour >= startHour) {
        adjustedDate.setUTCDate(adjustedDate.getUTCDate() + 1);
      }
      adjustedDate.setUTCHours(endHour, endMin + 15, 0, 0);

      return {
        optimalSendTime: adjustedDate.toISOString(),
        isDelayedForQuietHours: true,
        confidenceScore: 0.95,
        reason: `Target dispatch time intersects configured quiet hours (${quietStart}-${quietEnd}). Deferred to ${adjustedDate.toISOString()}`,
      };
    }

    // Default optimal morning engagement window: 09:15
    const optimalDate = new Date(candidateDate);
    if (currentHour < 8) {
      optimalDate.setUTCHours(9, 15, 0, 0);
    }

    return {
      optimalSendTime: optimalDate.toISOString(),
      isDelayedForQuietHours: false,
      confidenceScore: 0.88,
      reason: 'Dispatch scheduled within optimal engagement window',
    };
  }
}
