import { AdvisoryMatcher } from '@/lib/security/sbom/advisory-matcher';
import { SecurityVulnerability, SbomPackage } from '@/lib/security/sbom/sbom-types';

describe('AdvisoryMatcher', () => {
  const advisory: SecurityVulnerability = {
    id: 'CVE-TEST-001',
    package: 'test-dep',
    affectedVersions: '<2.5.0',
    patchedVersion: '2.5.0',
    severity: 'HIGH',
    cvssScore: 8.0,
    summary: 'Test vulnerability',
    publishedAt: new Date().toISOString(),
  };

  it('matches package version falling within affected range', () => {
    const pkg: SbomPackage = {
      name: 'test-dep',
      version: '2.4.1',
      purl: 'pkg:npm/test-dep@2.4.1',
      isDirectDependency: true,
    };

    expect(AdvisoryMatcher.isVulnerable(pkg, advisory)).toBe(true);
  });

  it('returns false when package is equal to or newer than patched version', () => {
    const pkg: SbomPackage = {
      name: 'test-dep',
      version: '2.5.0',
      purl: 'pkg:npm/test-dep@2.5.0',
      isDirectDependency: true,
    };

    expect(AdvisoryMatcher.isVulnerable(pkg, advisory)).toBe(false);
  });
});
