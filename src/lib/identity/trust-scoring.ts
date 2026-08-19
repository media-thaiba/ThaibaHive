import { DeviceFingerprint, computeDriftScore, fingerprintToTrustScore } from './device-fingerprint';

export interface TrustScoreResult {
  score: number;
  driftCount: number;
}

const trustScoreCache = new Map<string, { score: number, expiresAt: number }>();

export function computeTrustScore(baseline: DeviceFingerprint, current: DeviceFingerprint): TrustScoreResult {
  const driftCount = computeDriftScore(baseline, current);
  const score = fingerprintToTrustScore(driftCount);
  return { score, driftCount };
}

export function cacheTrustScore(deviceId: string, score: number, ttlMs = 3600 * 1000): void {
  trustScoreCache.set(deviceId, {
    score,
    expiresAt: Date.now() + ttlMs
  });
}

export function getCachedTrustScore(deviceId: string): number | null {
  const cached = trustScoreCache.get(deviceId);
  if (!cached) return null;
  
  if (Date.now() > cached.expiresAt) {
    trustScoreCache.delete(deviceId);
    return null;
  }
  
  return cached.score;
}
