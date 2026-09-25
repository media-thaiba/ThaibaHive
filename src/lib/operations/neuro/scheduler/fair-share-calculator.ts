import { JobPriority, NeuroFairShareQuotaItem, NeuroJobItem } from '../neuro-types';
import { FairShareWeightConfig, SchedulingQueueItem } from './scheduler-types';

export class FairShareCalculator {
  private static readonly DEFAULT_CONFIG: FairShareWeightConfig = {
    fairShareWeight: 0.5,
    jobPriorityWeight: 0.3,
    waitBoostWeight: 0.2,
    halfLifeDecayFactor: 0.95,
  };

  /**
   * Calculates the decayed historical usage: U_decayed = U_prev * lambda + new_usage
   */
  public static calculateDecayedUsage(
    previousUsage: number,
    newUsage: number,
    decayFactor: number = 0.95
  ): number {
    return Number((previousUsage * decayFactor + newUsage).toFixed(4));
  }

  /**
   * Calculates the Fair-Share score: S_i = allocatedWeight / (decayedUsage + 1.0)
   */
  public static calculateFairShareScore(
    allocatedWeight: number,
    decayedUsage: number
  ): number {
    const score = allocatedWeight / (Math.max(0, decayedUsage) + 1.0);
    return Number(score.toFixed(4));
  }

  /**
   * Maps job priority string to numeric weight
   */
  public static getPriorityMultiplier(priority: JobPriority): number {
    switch (priority) {
      case 'urgent':
        return 4.0;
      case 'high':
        return 2.5;
      case 'normal':
        return 1.0;
      case 'low':
        return 0.5;
      case 'preemptible':
        return 0.2;
      default:
        return 1.0;
    }
  }

  /**
   * Computes the composite priority score for a queued job.
   */
  public static computeCompositePriority(
    job: NeuroJobItem,
    quota: NeuroFairShareQuotaItem | null,
    now: Date = new Date(),
    config: FairShareWeightConfig = FairShareCalculator.DEFAULT_CONFIG
  ): SchedulingQueueItem {
    const fairShareScore = quota
      ? FairShareCalculator.calculateFairShareScore(quota.allocatedShareWeight, quota.historicalUsageDecayed)
      : 1.0;

    const priorityMultiplier = FairShareCalculator.getPriorityMultiplier(job.priority);

    // Compute wait time in hours
    const queuedTime = job.queuedAt ? new Date(job.queuedAt).getTime() : new Date(job.createdAt).getTime();
    const waitHours = Math.max(0, (now.getTime() - queuedTime) / (1000 * 60 * 60));
    const waitBoost = Math.min(4.0, waitHours * 0.25);

    const compositeScore =
      config.fairShareWeight * fairShareScore +
      config.jobPriorityWeight * priorityMultiplier +
      config.waitBoostWeight * waitBoost;

    return {
      job,
      compositePriorityScore: Number(compositeScore.toFixed(4)),
      fairShareScore,
      waitDurationHours: Number(waitHours.toFixed(2)),
    };
  }

  /**
   * Sorts queued jobs in descending order of composite priority score.
   */
  public static rankQueue(
    jobs: NeuroJobItem[],
    quotasMap: Map<string, NeuroFairShareQuotaItem>,
    now: Date = new Date(),
    config: FairShareWeightConfig = FairShareCalculator.DEFAULT_CONFIG
  ): SchedulingQueueItem[] {
    const scored = jobs.map((job) => {
      const quota = quotasMap.get(job.departmentId) || null;
      return FairShareCalculator.computeCompositePriority(job, quota, now, config);
    });

    return scored.sort((a, b) => b.compositePriorityScore - a.compositePriorityScore);
  }
}
