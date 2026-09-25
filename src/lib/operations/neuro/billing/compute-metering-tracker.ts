import { GpuTokenRateCard, MeteredComputeUsage } from './billing-types';

export class ComputeMeteringTracker {
  private static readonly RATE_CARDS: Record<string, GpuTokenRateCard> = {
    'nvidia-h100': {
      gpuModel: 'NVIDIA-H100',
      tokensPerHour: 8.0,
      dollarEquivalentPerHour: 4.0,
    },
    'nvidia-a100': {
      gpuModel: 'NVIDIA-A100',
      tokensPerHour: 4.0,
      dollarEquivalentPerHour: 2.0,
    },
    'nvidia-l40s': {
      gpuModel: 'NVIDIA-L40S',
      tokensPerHour: 2.0,
      dollarEquivalentPerHour: 1.0,
    },
    default: {
      gpuModel: 'STANDARD-GPU',
      tokensPerHour: 2.0,
      dollarEquivalentPerHour: 1.0,
    },
  };

  /**
   * Returns the rate card for a given GPU model.
   */
  public static getRateCard(gpuModel: string): GpuTokenRateCard {
    const key = gpuModel.toLowerCase();
    for (const [k, rate] of Object.entries(ComputeMeteringTracker.RATE_CARDS)) {
      if (key.includes(k)) return rate;
    }
    return ComputeMeteringTracker.RATE_CARDS.default;
  }

  /**
   * Meters compute usage for a job given its runtime in seconds and GPU count.
   */
  public static calculateComputeUsage(
    jobId: string,
    departmentId: string,
    gpuModel: string,
    gpuCount: number,
    runtimeSeconds: number,
    grantId?: string | null
  ): MeteredComputeUsage {
    const rate = ComputeMeteringTracker.getRateCard(gpuModel);
    const hours = runtimeSeconds / 3600;

    const tokensConsumed = Number((hours * gpuCount * rate.tokensPerHour).toFixed(4));
    const dollarEquivalent = Number((hours * gpuCount * rate.dollarEquivalentPerHour).toFixed(2));

    return {
      jobId,
      departmentId,
      grantId,
      gpuModel: rate.gpuModel,
      gpuCount,
      runtimeSeconds,
      tokensConsumed,
      dollarEquivalent,
      calculatedAt: new Date().toISOString(),
    };
  }
}
