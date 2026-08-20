import { CloudResourceMetrics, RightsizingRecommendation } from './cloud-types';

/**
 * Multi-Cloud Compute Cost Optimizer
 * Analyzes utilization metrics to identify over-provisioned and idle instances across AWS/GCP/Azure.
 */
export class CloudCostOptimizer {
  /**
   * Generates rightsizing and spot migration recommendations
   */
  public analyzeResource(metrics: CloudResourceMetrics): RightsizingRecommendation | null {
    // 1. Idle instance detection (< 5% CPU and < 15% memory for non-prod)
    if (metrics.environment !== 'production' && metrics.cpuUtilizationPercent < 5 && metrics.memoryUtilizationPercent < 15) {
      return {
        resourceId: metrics.resourceId,
        currentInstanceType: metrics.instanceType,
        recommendedInstanceType: 'NONE_TERMINATE',
        monthlySavingsDollars: metrics.currentMonthlyCostDollars,
        savingsPercentage: 100,
        actionRequired: 'TERMINATE_IDLE',
        confidenceScore: 0.95,
      };
    }

    // 2. Over-provisioned instance detection (< 20% average CPU)
    if (metrics.cpuUtilizationPercent < 20 && metrics.memoryUtilizationPercent < 40) {
      const savings = metrics.currentMonthlyCostDollars * 0.45;
      return {
        resourceId: metrics.resourceId,
        currentInstanceType: metrics.instanceType,
        recommendedInstanceType: this.getDownsizedType(metrics.instanceType),
        monthlySavingsDollars: Number(savings.toFixed(2)),
        savingsPercentage: 45,
        actionRequired: 'DOWNSCALE',
        confidenceScore: 0.90,
      };
    }

    // 3. Spot migration candidate (Staging/Dev workloads not already on spot)
    if (metrics.environment !== 'production' && !metrics.isSpotInstance) {
      const savings = metrics.currentMonthlyCostDollars * 0.65;
      return {
        resourceId: metrics.resourceId,
        currentInstanceType: metrics.instanceType,
        recommendedInstanceType: `${metrics.instanceType} (Spot)`,
        monthlySavingsDollars: Number(savings.toFixed(2)),
        savingsPercentage: 65,
        actionRequired: 'MIGRATE_TO_SPOT',
        confidenceScore: 0.92,
      };
    }

    return null;
  }

  private getDownsizedType(currentType: string): string {
    if (currentType.includes('2xlarge')) return currentType.replace('2xlarge', 'xlarge');
    if (currentType.includes('xlarge')) return currentType.replace('xlarge', 'large');
    if (currentType.includes('large')) return currentType.replace('large', 'medium');
    return 't3.small';
  }
}
