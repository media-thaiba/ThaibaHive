export interface GpuTokenRateCard {
  gpuModel: string;
  tokensPerHour: number;
  dollarEquivalentPerHour: number;
}

export interface MeteredComputeUsage {
  jobId: string;
  departmentId: string;
  grantId?: string | null;
  gpuModel: string;
  gpuCount: number;
  runtimeSeconds: number;
  tokensConsumed: number;
  dollarEquivalent: number;
  calculatedAt: string;
}

export interface GrantBudgetStatus {
  accountId: string;
  accountNumber: string;
  grantNumber: string;
  allocatedTokens: number;
  spentTokens: number;
  remainingTokens: number;
  utilizationPercentage: number;
  isSoftCapExceeded: boolean; // >= 80%
  isHardCapExceeded: boolean; // >= 100%
  status: 'NORMAL' | 'SOFT_CAP_WARNING' | 'HARD_CAP_EXHAUSTED';
}

export interface DoubleEntryTransactionReceipt {
  transactionId: string;
  accountId: string;
  debitAccountCode: string;
  creditAccountCode: string;
  tokensAmount: number;
  balanceBeforeTokens: number;
  balanceAfterTokens: number;
  merkleLeafHash: string;
  timestamp: string;
}
