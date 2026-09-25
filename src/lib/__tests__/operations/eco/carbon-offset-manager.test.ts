import { CarbonOffsetManager } from '../../../operations/eco/carbon/carbon-offset-manager';
import { RecRetirementTracker } from '../../../operations/eco/carbon/rec-retirement-tracker';
import { EcoDbStore } from '../../../db/eco-store';

describe('CarbonOffsetManager & RecRetirementTracker Unit Tests', () => {
  let offsetManager: CarbonOffsetManager;
  let store: EcoDbStore;

  beforeEach(() => {
    store = EcoDbStore.getInstance();
    store.clearMemoryStore();
    offsetManager = new CarbonOffsetManager(store);
  });

  it('should generate and verify cryptographic retirement certificate', () => {
    const cert = RecRetirementTracker.generateRetirementCertificate(
      'GS-104-987654',
      'gold_standard',
      'wind_renewable',
      150.0,
      '2026-Q2',
      'inst_alpha'
    );

    expect(cert.isVerified).toBe(true);
    expect(cert.verificationHash).toHaveLength(64); // SHA-256

    const isValid = RecRetirementTracker.verifyCertificate(cert);
    expect(isValid).toBe(true);

    // Tampered certificate verification
    const tampered = { ...cert, quantityTonsCo2e: 200.0 };
    expect(RecRetirementTracker.verifyCertificate(tampered)).toBe(false);
  });

  it('should register offset and prevent double-retirement', async () => {
    await offsetManager.registerOffset({
      offsetId: 'off_001',
      certificateNumber: 'VCS-2026-112233',
      registry: 'verra_vcs',
      offsetType: 'reforestation',
      vintageYear: 2025,
      quantityTonsCo2e: 100,
      institutionId: 'inst_alpha',
    });

    const balanceBefore = await offsetManager.getOffsetBalance('inst_alpha');
    expect(balanceBefore.activeTonsCo2e).toBe(100);
    expect(balanceBefore.retiredTonsCo2e).toBe(0);

    // First retirement -> success
    const res1 = await offsetManager.retireOffset('off_001', '2026-Q1', 'inst_alpha');
    expect(res1.success).toBe(true);
    expect(res1.certificate).toBeDefined();

    const balanceAfter = await offsetManager.getOffsetBalance('inst_alpha');
    expect(balanceAfter.activeTonsCo2e).toBe(0);
    expect(balanceAfter.retiredTonsCo2e).toBe(100);

    // Second retirement attempt -> blocked
    const res2 = await offsetManager.retireOffset('off_001', '2026-Q2', 'inst_alpha');
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('already retired');
  });
});
