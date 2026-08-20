/**
 * Statistical Drift Detection & Retraining Types (A-FED / EdgeMesh)
 */

export interface FeatureDistribution {
  featureName: string;
  baselineValues: number[];
  currentValues: number[];
}

export interface FeatureDriftReport {
  featureName: string;
  ksStatistic: number;       // D = sup |F1(x) - F2(x)|
  ksPValue: number;
  psiScore: number;          // Population Stability Index
  wassersteinDistance: number;
  driftSeverity: 'NONE' | 'LOW' | 'MODERATE' | 'SIGNIFICANT';
  isDrifted: boolean;
}

export interface ModelDriftSummary {
  modelId: string;
  overallPsi: number;
  maxFeatureKs: number;
  driftedFeatureCount: number;
  totalFeatures: number;
  hasSignificantDrift: boolean;
  featureReports: FeatureDriftReport[];
  retrainingRecommended: boolean;
  timestamp: string;
}

export interface RetrainingTriggerResult {
  triggerId: string;
  modelId: string;
  triggered: boolean;
  reason: string;
  roundInitiated?: number;
  privacyBudgetChecked: boolean;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'REJECTED';
}
