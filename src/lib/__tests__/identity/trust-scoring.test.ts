import { computeCompositeHash, computeDriftScore, fingerprintToTrustScore } from '../../identity/device-fingerprint';
import { computeTrustScore, cacheTrustScore, getCachedTrustScore } from '../../identity/trust-scoring';

describe('Device Fingerprinting & Trust Scoring', () => {
  const baseline = {
    ua: 'Mozilla/5.0',
    screenRes: '1920x1080',
    timezone: 'America/New_York',
    language: 'en-US'
  };

  it('should compute consistent composite hash', () => {
    const hash1 = computeCompositeHash(baseline);
    const hash2 = computeCompositeHash({ ...baseline });
    expect(hash1).toBe(hash2);
    
    const hash3 = computeCompositeHash({ ...baseline, ua: 'Chrome' });
    expect(hash1).not.toBe(hash3);
  });

  it('should compute drift score correctly', () => {
    expect(computeDriftScore(baseline, baseline)).toBe(0);
    expect(computeDriftScore(baseline, { ...baseline, ua: 'Chrome' })).toBe(1);
    expect(computeDriftScore(baseline, { ...baseline, ua: 'Chrome', timezone: 'UTC' })).toBe(2);
  });

  it('should map drift to trust score', () => {
    expect(fingerprintToTrustScore(0)).toBe(100);
    expect(fingerprintToTrustScore(1)).toBe(85);
    expect(fingerprintToTrustScore(2)).toBe(70);
    expect(fingerprintToTrustScore(3)).toBe(40);
  });

  it('should compute trust score directly', () => {
    const result = computeTrustScore(baseline, { ...baseline, ua: 'Chrome' });
    expect(result.score).toBe(85);
    expect(result.driftCount).toBe(1);
  });

  it('should cache trust score', () => {
    cacheTrustScore('device1', 95, 1000);
    expect(getCachedTrustScore('device1')).toBe(95);
    
    cacheTrustScore('device2', 80, -1000); // expired
    expect(getCachedTrustScore('device2')).toBeNull();
  });
});
