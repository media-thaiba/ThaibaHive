import { NeuroDbStore } from '../../../db/neuro-store';
import { ComputeBillingEngine } from '../../../operations/neuro/billing/compute-billing-engine';

describe('ComputeBillingEngine & Metering (NEURO-010)', () => {
  let store: NeuroDbStore;
  let engine: ComputeBillingEngine;

  beforeEach(async () => {
    store = NeuroDbStore.getInstance();
    store.clearMemoryStore();
    engine = new ComputeBillingEngine(store);

    await store.createBillingAccount({
      accountNumber: 'ACC-NSF-AI-01',
      departmentId: 'dept_cs',
      grantId: 'NSF-2026-AI-CORE',
      tokenBalance: 100.0,
      tokenAllocatedTotal: 100.0,
      tokenSpentTotal: 0.0,
      softCapPercent: 80.0,
      hardCapTokens: 100.0,
      institutionId: 'inst_01',
    });
  });

  it('should meter GPU compute usage and debit tokens accurately', async () => {
    // 4 GPUs for 2 hours (7200 seconds) on NVIDIA-H100 (8 tokens/GPU-hr) -> 4 * 2 * 8 = 64 tokens
    const result = await engine.debitJobCompute(
      'JOB-TEST-01',
      'dept_cs',
      'NVIDIA-H100-SXM5-80GB',
      4,
      7200,
      'NSF-2026-AI-CORE',
      'inst_01'
    );

    expect(result.usage.tokensConsumed).toBe(64.0);
    expect(result.receipt?.balanceAfterTokens).toBe(36.0);
    expect(result.budgetStatus?.spentTokens).toBe(64.0);
    expect(result.budgetStatus?.isSoftCapExceeded).toBe(false);
  });

  it('should trigger soft cap warning at 80% and hard cap lock at 100% grant usage', async () => {
    // Debit 85 tokens (85%)
    const res1 = await engine.debitJobCompute(
      'JOB-HEAVY-01',
      'dept_cs',
      'NVIDIA-H100-SXM5-80GB',
      8,
      4781.25, // 8 * (4781.25/3600) * 8 = ~85 tokens
      'NSF-2026-AI-CORE',
      'inst_01'
    );

    expect(res1.budgetStatus?.isSoftCapExceeded).toBe(true);
    expect(res1.budgetStatus?.status).toBe('SOFT_CAP_WARNING');

    // Debit another 20 tokens -> Total > 100 tokens -> Hard cap lock
    const res2 = await engine.debitJobCompute(
      'JOB-HEAVY-02',
      'dept_cs',
      'NVIDIA-H100-SXM5-80GB',
      8,
      1125, // ~20 tokens
      'NSF-2026-AI-CORE',
      'inst_01'
    );

    expect(res2.budgetStatus?.isHardCapExceeded).toBe(true);
    expect(res2.budgetStatus?.status).toBe('HARD_CAP_EXHAUSTED');
  });
});
