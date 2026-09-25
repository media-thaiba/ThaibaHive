import { NeuroDbStore, neuroStore } from '../../../db/neuro-store';
import { FundingAgency, NeuroComputeBillingAccountItem, NeuroGrantCreditAllocationItem } from '../neuro-types';

export class GrantAllocationManager {
  private store: NeuroDbStore;

  constructor(store: NeuroDbStore = neuroStore) {
    this.store = store;
  }

  /**
   * Allocates new research grant compute tokens to a departmental account.
   */
  public async allocateGrantTokens(
    accountNumber: string,
    departmentId: string,
    grantNumber: string,
    fundingAgency: FundingAgency,
    tokens: number,
    allocatedByUserId: string,
    effectiveDate: string,
    expiryDate: string,
    tenantId: string = 'global'
  ): Promise<{
    account: NeuroComputeBillingAccountItem;
    allocation: NeuroGrantCreditAllocationItem;
  }> {
    let account = await this.store.getBillingAccountById(accountNumber, tenantId);

    if (!account) {
      account = await this.store.createBillingAccount({
        accountNumber,
        departmentId,
        grantId: grantNumber,
        tokenBalance: tokens,
        tokenAllocatedTotal: tokens,
        tokenSpentTotal: 0,
        softCapPercent: 80,
        hardCapTokens: tokens,
        institutionId: tenantId,
      });
    } else {
      account = await this.store.createBillingAccount({
        ...account,
        tokenBalance: account.tokenBalance + tokens,
        tokenAllocatedTotal: account.tokenAllocatedTotal + tokens,
        hardCapTokens: account.hardCapTokens + tokens,
        isHardCapLocked: false,
        status: 'active',
        institutionId: tenantId,
      });
    }

    const allocationId = `ALLOC_${grantNumber}_${Date.now()}`;
    const allocation: NeuroGrantCreditAllocationItem = {
      id: `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      allocationId,
      accountId: account.id,
      grantNumber,
      fundingAgency,
      creditedTokens: tokens,
      dollarEquivalentUsd: tokens * 0.5,
      allocatedByUserId,
      effectiveDate,
      expiryDate,
      institutionId: tenantId,
      createdAt: new Date().toISOString(),
    };

    return { account, allocation };
  }
}
