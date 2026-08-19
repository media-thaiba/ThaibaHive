import { PatchVerifier } from '@/lib/security/sbom/patch-verifier';
import { SbomPackage, SecurityVulnerability } from '@/lib/security/sbom/sbom-types';

describe('PatchVerifier', () => {
  it('generates non-breaking patch recommendation when major version is same', () => {
    const pkg: SbomPackage = {
      name: 'jose',
      version: '4.14.0',
      purl: 'pkg:npm/jose@4.14.0',
      isDirectDependency: true,
    };

    const vuln: SecurityVulnerability = {
      id: 'CVE-2024-34567',
      package: 'jose',
      affectedVersions: '<4.15.5',
      patchedVersion: '4.15.5',
      severity: 'HIGH',
      cvssScore: 7.5,
      summary: 'Signature flaw',
      publishedAt: '2024-05-10T00:00:00Z',
    };

    const rec = PatchVerifier.verifyPatch(pkg, vuln);
    expect(rec).not.toBeNull();
    expect(rec?.recommendedVersion).toBe('^4.15.5');
    expect(rec?.isBreakingChange).toBe(false);
    expect(rec?.confidenceScore).toBe(95);
  });
});
