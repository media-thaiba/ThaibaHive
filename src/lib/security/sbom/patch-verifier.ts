/**
 * Automated Auto-Patch Verifier
 * Sprint-041 (ZASM)
 */

import { SbomPackage, SecurityVulnerability } from './sbom-types';

export interface PatchRecommendation {
  packageName: string;
  currentVersion: string;
  recommendedVersion: string;
  isBreakingChange: boolean;
  vulnerabilityFixed: string;
  severity: string;
  confidenceScore: number;
}

export class PatchVerifier {
  /**
   * Generates patch recommendations for vulnerable packages
   */
  public static verifyPatch(pkg: SbomPackage, vulnerability: SecurityVulnerability): PatchRecommendation | null {
    if (!vulnerability.patchedVersion) {
      return null;
    }

    const currentClean = pkg.version.replace(/^\^|~/, '').trim();
    const currentMajor = parseInt(currentClean.split('.')[0], 10) || 0;
    const patchedMajor = parseInt(vulnerability.patchedVersion.split('.')[0], 10) || 0;

    const isBreakingChange = patchedMajor > currentMajor;
    const confidenceScore = isBreakingChange ? 70 : 95;

    return {
      packageName: pkg.name,
      currentVersion: pkg.version,
      recommendedVersion: `^${vulnerability.patchedVersion}`,
      isBreakingChange,
      vulnerabilityFixed: vulnerability.id,
      severity: vulnerability.severity,
      confidenceScore,
    };
  }
}
