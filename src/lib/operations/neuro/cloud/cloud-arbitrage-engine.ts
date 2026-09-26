import { NeuroJobItem } from '../neuro-types';
import { ArbitrageDecision } from './cloud-types';
import { SpotPriceAggregator } from './spot-price-aggregator';

export class CloudArbitrageEngine {
  /**
   * Computes the optimal execution target (On-Premise vs Cloud Spot Arbitrage)
   */
  public static evaluateArbitrage(
    job: NeuroJobItem,
    estimatedRuntimeHours: number = 4.0,
    onPremiseBusyGpuCount: number = 0,
    onPremiseTotalGpuCount: number = 64
  ): ArbitrageDecision {
    const quotes = SpotPriceAggregator.getQuotes(job.gpuModelRequirement);
    const onPremQuote = quotes.find((q) => q.provider === 'on_prem') || quotes[0];
    const cloudQuotes = quotes.filter((q) => q.provider !== 'on_prem');

    const onPremUtilization = onPremiseTotalGpuCount > 0 ? onPremiseBusyGpuCount / onPremiseTotalGpuCount : 1.0;

    // If on-premise cluster has capacity (< 85% utilized) and job is not urgent, prioritize local
    if (onPremUtilization < 0.85 && job.priority !== 'urgent') {
      const estimatedCost = onPremQuote.spotPriceUsdPerHour * job.requestedGpus * estimatedRuntimeHours;
      return {
        jobId: job.id,
        recommendedTarget: 'on_prem',
        selectedQuote: onPremQuote,
        estimatedCostUsd: Number(estimatedCost.toFixed(2)),
        savingsVsOnDemandUsd: 0,
        savingsPercent: 0,
        carbonIntensityGCO2PerKwh: 120,
        rationale: 'Local datacenter capacity available; zero egress costs with lowest carbon footprint.',
      };
    }

    // Otherwise, find lowest cost spot cloud provider with acceptable interruption risk
    const sortedCloud = [...cloudQuotes].sort((a, b) => {
      const costPerGpuA = a.spotPriceUsdPerHour / a.gpuCount;
      const costPerGpuB = b.spotPriceUsdPerHour / b.gpuCount;
      return costPerGpuA - costPerGpuB;
    });

    const bestCloud = sortedCloud[0] || onPremQuote;
    const costPerGpuSpot = bestCloud.spotPriceUsdPerHour / bestCloud.gpuCount;
    const costPerGpuOnDemand = bestCloud.onDemandPriceUsdPerHour / bestCloud.gpuCount;

    const estimatedSpotCost = costPerGpuSpot * job.requestedGpus * estimatedRuntimeHours;
    const estimatedOnDemandCost = costPerGpuOnDemand * job.requestedGpus * estimatedRuntimeHours;
    const savingsUsd = estimatedOnDemandCost - estimatedSpotCost;
    const savingsPct = estimatedOnDemandCost > 0 ? (savingsUsd / estimatedOnDemandCost) * 100 : 0;

    return {
      jobId: job.id,
      recommendedTarget: bestCloud.provider,
      selectedQuote: bestCloud,
      estimatedCostUsd: Number(estimatedSpotCost.toFixed(2)),
      savingsVsOnDemandUsd: Number(savingsUsd.toFixed(2)),
      savingsPercent: Number(savingsPct.toFixed(1)),
      carbonIntensityGCO2PerKwh: 280,
      rationale: `On-premise cluster busy (${(onPremUtilization * 100).toFixed(0)}% load). Hybrid spot burst to ${bestCloud.provider.toUpperCase()} saves ${savingsPct.toFixed(1)}% vs on-demand.`,
    };
  }
}
