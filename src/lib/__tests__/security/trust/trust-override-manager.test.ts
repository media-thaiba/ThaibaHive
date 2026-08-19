import { TrustOverrideManager } from '@/lib/security/trust/trust-override-manager';

describe('TrustOverrideManager', () => {
  beforeEach(() => {
    TrustOverrideManager.resetInstance();
  });

  it('applies and retrieves manual device trust overrides', () => {
    const manager = TrustOverrideManager.getInstance();
    const override = manager.applyOverride({
      deviceId: 'dev-lab-99',
      forcedScore: 95,
      reason: 'Approved test fixture in security sandbox',
      appliedBy: 'sec-lead',
      ttlHours: 12,
    });

    expect(override.forcedScore).toBe(95);
    expect(override.forcedTier).toBe('HIGH_TRUST');
    expect(override.appliedBy).toBe('sec-lead');

    const active = manager.getActiveOverride('dev-lab-99');
    expect(active?.forcedScore).toBe(95);
  });

  it('rejects overrides without a justification reason', () => {
    const manager = TrustOverrideManager.getInstance();
    expect(() => {
      manager.applyOverride({
        deviceId: 'dev-01',
        forcedScore: 100,
        reason: '',
        appliedBy: 'admin',
      });
    }).toThrow('Justification reason is required');
  });

  it('removes overrides on demand', () => {
    const manager = TrustOverrideManager.getInstance();
    manager.applyOverride({
      deviceId: 'dev-02',
      forcedScore: 10,
      reason: 'Quarantine override',
      appliedBy: 'admin',
    });

    expect(manager.getActiveOverride('dev-02')).toBeDefined();
    manager.removeOverride('dev-02');
    expect(manager.getActiveOverride('dev-02')).toBeUndefined();
  });
});
