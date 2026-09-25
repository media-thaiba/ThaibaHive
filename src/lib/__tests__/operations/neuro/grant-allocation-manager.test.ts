import { NeuroDbStore } from '../../../db/neuro-store';
import { GrantAllocationManager } from '../../../operations/neuro/billing/grant-allocation-manager';
import { DoubleEntryLedger } from '../../../operations/neuro/billing/double-entry-ledger';

describe('GrantAllocationManager & DoubleEntryLedger (NEURO-011)', () => {
  let store: NeuroDbStore;
  let allocManager: GrantAllocationManager;
  let ledger: DoubleEntryLedger;

  beforeEach(() => {
    store = NeuroDbStore.getInstance();
    store.clearMemoryStore();
    allocManager = new GrantAllocationManager(store);
    ledger = new DoubleEntryLedger(store);
  });

  it('should provision grant compute allocations and increment token budgets', async () => {
    const { account, allocation } = await allocManager.allocateGrantTokens(
      'ACC-DOE-CLIMATE-01',
      'dept_earth_sci',
      'DOE-DE-SC0023456',
      'DOE',
      10000,
      'staff_dean_research',
      '2026-09-01',
      '2027-08-31',
      'inst_01'
    );

    expect(account.tokenBalance).toBe(10000);
    expect(account.grantId).toBe('DOE-DE-SC0023456');
    expect(allocation.creditedTokens).toBe(10000);
    expect(allocation.fundingAgency).toBe('DOE');
  });

  it('should verify ledger balance and reconciliation status', async () => {
    const { account } = await allocManager.allocateGrantTokens(
      'ACC-NIH-GENOMICS-01',
      'dept_genetics',
      'NIH-U01-HG009876',
      'NIH',
      5000,
      'staff_admin',
      '2026-09-01',
      '2027-08-31',
      'inst_01'
    );

    await store.postLedgerTransaction({
      transactionId: 'TX-GENOMICS-001',
      accountId: account.id,
      transactionType: 'compute_debit',
      tokensAmount: 250,
      balanceAfterTokens: 4750,
      description: 'Genome Sequence Alignment Batch',
      institutionId: 'inst_01',
    });

    const reconciliation = await ledger.reconcileAccount(account.id, 'inst_01');

    expect(reconciliation.isBalanced).toBe(true);
    expect(reconciliation.totalDebits).toBe(250);
    expect(reconciliation.auditStatus).toBe('VERIFIED');
  });
});
