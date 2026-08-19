/**
 * Security Advisory Matcher
 * Sprint-041 (ZASM)
 */

import { SecurityVulnerability, SbomPackage } from './sbom-types';

export class AdvisoryMatcher {
  /**
   * Evaluates whether a package version is vulnerable according to the advisory affected range
   */
  public static isVulnerable(pkg: SbomPackage, advisory: SecurityVulnerability): boolean {
    if (pkg.name !== advisory.package) {
      return false;
    }

    const cleanVer = pkg.version.replace(/^\^|~/, '').trim();
    const affected = advisory.affectedVersions.trim();

    // Support basic semver comparisons e.g. "<4.15.5" or "<=1.2.3" or "==1.0.0"
    if (affected.startsWith('<=')) {
      const target = affected.replace('<=', '').trim();
      return this.compareVersions(cleanVer, target) <= 0;
    }
    if (affected.startsWith('<')) {
      const target = affected.replace('<', '').trim();
      return this.compareVersions(cleanVer, target) < 0;
    }
    if (affected.startsWith('==') || affected.startsWith('=')) {
      const target = affected.replace(/^==?/, '').trim();
      return this.compareVersions(cleanVer, target) === 0;
    }

    // Default to true if exact match or wildcards
    return cleanVer === affected || affected === '*';
  }

  /**
   * Basic semver comparator (returns -1 if v1 < v2, 1 if v1 > v2, 0 if equal)
   */
  public static compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map((p) => parseInt(p, 10) || 0);
    const parts2 = v2.split('.').map((p) => parseInt(p, 10) || 0);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    return 0;
  }
}
