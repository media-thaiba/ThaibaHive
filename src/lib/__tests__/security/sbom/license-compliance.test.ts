import { LicenseComplianceChecker } from '@/lib/security/sbom/license-compliance-checker';
import { SbomPackage } from '@/lib/security/sbom/sbom-types';

describe('LicenseComplianceChecker', () => {
  it('approves permissive licenses (MIT, Apache-2.0, BSD)', () => {
    const pkg: SbomPackage = {
      name: 'drizzle-orm',
      version: '0.33.0',
      purl: 'pkg:npm/drizzle-orm@0.33.0',
      license: 'Apache-2.0',
      isDirectDependency: true,
    };

    const report = LicenseComplianceChecker.auditPackage(pkg);
    expect(report.compliant).toBe(true);
    expect(report.riskTier).toBe('PERMISSIVE');
  });

  it('flags restrictive copyleft licenses (AGPL-3.0, GPL-3.0)', () => {
    const pkg: SbomPackage = {
      name: 'viral-copyleft-lib',
      version: '1.0.0',
      purl: 'pkg:npm/viral-copyleft-lib@1.0.0',
      license: 'AGPL-3.0',
      isDirectDependency: true,
    };

    const report = LicenseComplianceChecker.auditPackage(pkg);
    expect(report.compliant).toBe(false);
    expect(report.riskTier).toBe('RESTRICTIVE_COPYLEFT');
    expect(report.notes).toContain('viral');
  });
});
