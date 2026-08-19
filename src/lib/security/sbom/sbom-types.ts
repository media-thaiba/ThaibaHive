/**
 * Software Bill of Materials (SBOM) Type Definitions
 * Sprint-041 (ZASM)
 */

export type SbomFormat = 'CycloneDX_JSON' | 'SPDX_JSON';
export type VulnSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface SbomPackage {
  name: string;
  version: string;
  purl: string; // Package URL e.g. "pkg:npm/jose@5.9.6"
  description?: string;
  license?: string;
  author?: string;
  sha256?: string;
  isDirectDependency: boolean;
  dependencies?: string[];
}

export interface SbomDocument {
  format: SbomFormat;
  specVersion: string;
  serialNumber: string;
  timestamp: string;
  component: {
    name: string;
    version: string;
    type: 'application' | 'library';
  };
  packages: SbomPackage[];
  metadata?: Record<string, any>;
}

export interface SecurityVulnerability {
  id: string; // e.g. CVE-2026-1234 or GHSA-xxxx-xxxx
  package: string;
  affectedVersions: string;
  patchedVersion?: string;
  severity: VulnSeverity;
  cvssScore: number;
  summary: string;
  publishedAt: string;
  advisoryUrl?: string;
}

export interface SbomScanResult {
  scanId: string;
  timestamp: string;
  totalPackagesScanned: number;
  vulnerablePackageCount: number;
  vulnerabilities: {
    package: SbomPackage;
    vulnerabilities: SecurityVulnerability[];
  }[];
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}
