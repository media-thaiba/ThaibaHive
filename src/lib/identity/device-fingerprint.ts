import * as crypto from 'crypto';

export interface DeviceFingerprint {
  ua: string;
  screenRes: string;
  timezone: string;
  language: string;
  canvasHash?: string;
  compositeHash?: string;
}

export function computeCompositeHash(fingerprint: DeviceFingerprint): string {
  const attributes = [
    fingerprint.ua,
    fingerprint.screenRes,
    fingerprint.timezone,
    fingerprint.language,
    fingerprint.canvasHash || ''
  ].sort().join('|');

  return crypto.createHash('sha256').update(attributes).digest('hex');
}

export function computeDriftScore(baseline: DeviceFingerprint, current: DeviceFingerprint): number {
  let driftCount = 0;
  
  if (baseline.ua !== current.ua) driftCount++;
  if (baseline.screenRes !== current.screenRes) driftCount++;
  if (baseline.timezone !== current.timezone) driftCount++;
  if (baseline.language !== current.language) driftCount++;
  if (baseline.canvasHash !== current.canvasHash) driftCount++;

  return driftCount;
}

export function fingerprintToTrustScore(driftCount: number): number {
  if (driftCount === 0) return 100;
  if (driftCount === 1) return 85;
  if (driftCount === 2) return 70;
  return 40; // 3+
}
