import { MomentsAccountant } from '@/lib/operations/privacy/moments-accountant';

describe('MomentsAccountant (Renyi DP Composition)', () => {
  it('should accumulate RDP steps and compute tight epsilon bound', () => {
    const accountant = new MomentsAccountant(1e-5);

    // Run 10 steps with sigma = 4.0
    for (let s = 0; s < 10; s++) {
      accountant.stepGaussian(4.0, 1.0);
    }

    expect(accountant.getSteps()).toBe(10);
    const eps = accountant.getEpsilon();
    expect(eps).toBeGreaterThan(0);
    expect(eps).toBeLessThan(10.0);
  });

  it('should reset state cleanly', () => {
    const accountant = new MomentsAccountant(1e-5);
    accountant.stepGaussian(2.0);
    expect(accountant.getSteps()).toBe(1);

    accountant.reset();
    expect(accountant.getSteps()).toBe(0);
  });
});
