/**
 * Multi-Cloud Cost Optimization & Spot Orchestration Types (AIMS / AutoOps)
 */

export type CloudProvider = 'AWS' | 'GCP' | 'AZURE' | 'ON_PREMISE';

export interface CloudResourceMetrics {
  resourceId: string;
  provider: CloudProvider;
  region: string;
  instanceType: string;
  clusterName: string;
  environment: 'production' | 'staging' | 'development';
  cpuUtilizationPercent: number;
  memoryUtilizationPercent: number;
  currentMonthlyCostDollars: number;
  isSpotInstance: boolean;
  timestamp: string;
  institutionId: string;
}

export interface RightsizingRecommendation {
  resourceId: string;
  currentInstanceType: string;
  recommendedInstanceType: string;
  monthlySavingsDollars: number;
  savingsPercentage: number;
  actionRequired: 'DOWNSCALE' | 'MIGRATE_TO_SPOT' | 'TERMINATE_IDLE';
  confidenceScore: number;
}

export interface SpotMigrationPlan {
  planId: string;
  clusterName: string;
  targetSpotRatio: number; // e.g. 0.60 (60% spot, 40% on-demand)
  currentSpotCount: number;
  currentOnDemandCount: number;
  projectedAnnualSavingsDollars: number;
  fallbackOnDemandType: string;
  preDrainNoticeBufferSeconds: number;
  status: 'PENDING' | 'EXECUTING' | 'ACTIVE' | 'ROLLED_BACK';
  institutionId: string;
}
