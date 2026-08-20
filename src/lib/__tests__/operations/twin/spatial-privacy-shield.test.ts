import { SpatialPrivacyShield } from '../../../operations/twin/security/spatial-privacy-shield';
import { TwinAuditLogger } from '../../../operations/twin/security/twin-audit-logger';

describe('Spatial Privacy Shield & Cryptographic Merkle Audit Logger', () => {
  let auditLogger: TwinAuditLogger;

  beforeEach(() => {
    auditLogger = TwinAuditLogger.getInstance();
    auditLogger.clear();
  });

  it('should mask precise asset coordinates for student/public roles', () => {
    const precise = { x: 12.34, y: 47.89, z: 3.5 };
    const masked = SpatialPrivacyShield.maskAssetCoordinates(precise, 'student');

    // Rounding to nearest 5m
    expect(masked.x).toBe(10);
    expect(masked.y).toBe(50);
    expect(masked.z).toBe(3.5);

    // Admin receives full unmasked precision
    const unmasked = SpatialPrivacyShield.maskAssetCoordinates(precise, 'admin');
    expect(unmasked.x).toBe(12.34);
    expect(unmasked.y).toBe(47.89);
  });

  it('should create Merkle audit entries and verify chain integrity', () => {
    auditLogger.logEvent('facility_created', 'user_admin', { name: 'Lab Complex' }, 'inst_01', 'FAC-01');
    auditLogger.logEvent('hazard_declared', 'user_safety', { hazard: 'smoke' }, 'inst_01', 'FAC-01');
    auditLogger.logEvent('space_updated', 'user_admin', { capacity: 50 }, 'inst_01', 'FAC-01');

    const trail = auditLogger.getAuditTrail('inst_01');
    expect(trail.length).toBe(3);
    expect(trail[0].previousHash).toBe('0000000000000000000000000000000000000000000000000000000000000000');
    expect(trail[1].previousHash).not.toBe('0000000000000000000000000000000000000000000000000000000000000000');

    expect(auditLogger.verifyChainIntegrity()).toBe(true);
  });
});
