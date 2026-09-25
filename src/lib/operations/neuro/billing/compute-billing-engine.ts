import { NeuroDbStore, neuroStore } from '../../../db/neuro-store';
import { MerkleLineageDAG } from '../provenance/merkle-lineage-dag';
import { ComputeMeteringTracker } from './compute-metering-tracker';
import { DoubleEntryTransactionReceipt, GrantBudgetStatus, MeteredComputeUsage } from './billing-types';

export class ComputeBillingEngine {
  private store: NeuroDbStore;

  constructor(store: NeuroDbStore = neuroStore) {
    this.store = store;
  }

  /**
   * Finalizes a completed job compute charge and debits the associated grant/department account.
   */
  public async debitJobCompute(
    jobId: string,
    departmentId: string,
    gpuModel: string,
    gpuCount: number,
    runtimeSeconds: number,
    grantId?: string | null,
    tenantId: string = 'global'
  ): Promise<{
    usage: MeteredComputeUsage;
    receipt: DoubleEntryTransactionReceipt | null;
    budgetStatus: GrantBudgetStatus | null;
  }> {
    const usage = ComputeMeteringTracker.calculateComputeUsage(
      jobId,
      departmentId,
      gpuModel,
      gpuCount,
      runtimeSeconds,
      grantId
    );

    // Find billing account
    const accounts = await this.store.listBillingAccounts(departmentId, tenantId);
    const account = accounts.find((a) => (grantId ? a.grantId === grantId : true)) || accounts[0];

    if (!account) {
      return { usage, receipt: null, budgetStatus: null };
    }

    const balanceBefore = account.tokenBalance;
    const balanceAfter = Math.max(0, balanceBefore - usage.tokensConsumed);
    const spentTotalAfter = account.tokenSpentTotal + usage.tokensConsumed;

    const txId = `TX_${jobId}_${Date.now()}`;
    const merkleLeafHash = MerkleLineageDAG.computeSha256({
      txId,
      accountId: account.id,
      jobId,
      tokensAmount: usage.tokensConsumed,
      balanceAfter,
      timestamp: new Date().toISOString(),
    });

    // Record ledger transaction
    await this.store.postLedgerTransaction({
      transactionId: txId,
      accountId: account.id,
      jobId,
      tokensAmount: usage.tokensConsumed,
      gpuSeconds: runtimeSeconds * gpuCount,
      gpuModelRateApplied: usage.gpuModel,
      debitAccountCode: 'EXPENSE:GRANT_COMPUTE',
      creditAccountCode: 'REVENUE:HPC_CLUSTER_OPS',
      balanceAfterTokens: Number(balanceAfter.toFixed(2)),
      description: `Compute charge for job ${jobId} (${gpuCount}x ${usage.gpuModel})`,
      merkleLeafHash,
      institutionId: tenantId,
    });

    // Update account balances
    const utilizationPct = account.tokenAllocatedTotal > 0 ? (spentTotalAfter / account.tokenAllocatedTotal) * 100 : 100;
    const isSoftCap = utilizationPct >= account.softCapPercent;
    const isHardCap = spentTotalAfter >= account.hardCapTokens || balanceAfter <= 0;

    let accountStatus = account.status;
    if (isHardCap) {
      accountStatus = 'suspended';
    } else if (isSoftCap) {
      accountStatus = 'warning';
    }

    await this.store.createBillingAccount({
      ...account,
      tokenBalance: Number(balanceAfter.toFixed(2)),
      tokenSpentTotal: Number(spentTotalAfter.toFixed(2)),
      isHardCapLocked: isHardCap,
      status: accountStatus,
      institutionId: tenantId,
    });

    const receipt: DoubleEntryTransactionReceipt = {
      transactionId: txId,
      accountId: account.id,
      debitAccountCode: 'EXPENSE:GRANT_COMPUTE',
      creditAccountCode: 'REVENUE:HPC_CLUSTER_OPS',
      tokensAmount: usage.tokensConsumed,
      balanceBeforeTokens: balanceBefore,
      balanceAfterTokens: Number(balanceAfter.toFixed(2)),
      merkleLeafHash,
      timestamp: new Date().toISOString(),
    };

    const budgetStatus: GrantBudgetStatus = {
      accountId: account.id,
      accountNumber: account.accountNumber,
      grantNumber: account.grantId || 'UNALLOCATED',
      allocatedTokens: account.tokenAllocatedTotal,
      spentTokens: Number(spentTotalAfter.toFixed(2)),
      remainingTokens: Number(balanceAfter.toFixed(2)),
      utilizationPercentage: Number(utilizationPct.toFixed(1)),
      isSoftCapExceeded: isSoftCap,
      isHardCapExceeded: isHardCap,
      status: isHardCap ? 'HARD_CAP_EXHAUSTED' : isSoftCap ? 'SOFT_CAP_WARNING' : 'NORMAL',
    };

    return { usage, receipt, budgetStatus };
  }
}
