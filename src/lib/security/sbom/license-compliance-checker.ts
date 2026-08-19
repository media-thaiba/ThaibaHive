/**
 * Open-Source License Compliance Checker
 * Sprint-041 (ZASM)
 */

import { SbomPackage } from './sbom-types';

export type LicenseRiskTier = 'PERMISSIVE' | 'RECIPROCAL_NOTICE' | 'RESTRICTIVE_COPYLEFT' | 'UNAPPROVED';

export interface LicenseAuditReport {
  packageName: string;
  version: string;
  license: string;
  riskTier: LicenseRiskTier;
  compliant: boolean;
  notes?: string;
}

export class LicenseComplianceChecker {
  private static permissiveLicenses = new Set([
    'MIT',
    'Apache-2.0',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'ISC',
    '0BSD',
    'CC0-1.0',
    'Unlicense',
  ]);

  private static copyleftLicenses = new Set([
    'GPL-2.0',
    'GPL-3.0',
    'AGPL-3.0',
    'LGPL-2.1',
    'LGPL-3.0',
    'SSPL',
  ]);

  /**
   * Evaluates license compliance for a package
   */
  public static auditPackage(pkg: SbomPackage): LicenseAuditReport {
    const rawLicense = (pkg.license || 'UNKNOWN').trim();

    if (this.permissiveLicenses.has(rawLicense)) {
      return {
        packageName: pkg.name,
        version: pkg.version,
        license: rawLicense,
        riskTier: 'PERMISSIVE',
        compliant: true,
      };
    }

    if (this.copyleftLicenses.has(rawLicense)) {
      return {
        packageName: pkg.name,
        version: pkg.version,
        license: rawLicense,
        riskTier: 'RESTRICTIVE_COPYLEFT',
        compliant: false,
        notes: `Strong copyleft license '${rawLicense}' may impose viral license requirements on internal code`,
      };
    }

    return {
      packageName: pkg.name,
      version: pkg.version,
      license: rawLicense,
      riskTier: 'UNAPPROVED',
      compliant: false,
      notes: `Unrecognized or unapproved license '${rawLicense}' requires legal review`,
    };
  }

  /**
   * Audits an array of packages
   */
  public static auditAll(packages: SbomPackage[]): {
    totalAudited: number;
    compliantCount: number;
    nonCompliantCount: number;
    reports: LicenseAuditReport[];
  } {
    const reports = packages.map((p) => this.auditPackage(p));
    const compliantCount = reports.filter((r) => r.compliant).length;
    const nonCompliantCount = reports.length - compliantCount;

    return {
      totalAudited: packages.length,
      compliantCount,
      nonCompliantCount,
      reports,
    };
  }
}
