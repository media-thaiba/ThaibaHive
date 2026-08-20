/**
 * Differential Privacy Types & Hyperparameters (A-FED / EdgeMesh)
 */

export interface DPParameters {
  epsilon: number;        // Privacy loss parameter (e.g. 0.5 - 4.0)
  delta: number;          // Failure probability (e.g. 1e-5)
  sensitivity: number;    // L1 or L2 query/gradient sensitivity Delta f
  mechanism: 'gaussian' | 'laplace' | 'analytic_gaussian';
  clipNorm?: number;      // L2 norm clipping threshold C
}

export interface PrivacyBudgetStatus {
  tenantId: string;
  totalBudgetEpsilon: number;
  consumedEpsilon: number;
  remainingEpsilon: number;
  totalBudgetDelta: number;
  consumedDelta: number;
  remainingDelta: number;
  isExhausted: boolean;
  totalRoundsCounted: number;
  lastUpdated: string;
}

export interface MomentsAccountantState {
  orders: number[];       // Renyi orders lambda
  rdpLoss: number[];      // Accumulated Renyi divergence per lambda order
  steps: number;
  targetDelta: number;
}
