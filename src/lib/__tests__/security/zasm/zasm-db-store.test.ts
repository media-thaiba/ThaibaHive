import { ZasmDbStore } from '@/lib/security/zasm/zasm-db-store';
import { DeviceTrustScore } from '@/lib/security/trust/trust-types';
import { SegmentationPolicyRule } from '@/lib/security/segmentation/segmentation-types';
import { IssuedCertificate } from '@/lib/security/pki/pki-types';
import { SbomScanResult } from '@/lib/security/sbom/sbom-types';
import { ForensicInvestigationReport } from '@/lib/security/forensics/forensic-types';

describe('ZasmDbStore', () => {
  it('saves and lists device trust evaluations without throwing', async () => {
    const score: DeviceTrustScore = {
      deviceId: 'dev-db-test-01',
      tenantId: 'global',
      score: 88,
      tier: 'HIGH_TRUST',
      factorBreakdown: {
        osAndPatchScore: 25,
        endpointComplianceScore: 20,
        dpopBindingScore: 20,
        authStrengthScore: 15,
        geoRiskScore: 4,
        behavioralStabilityScore: 4,
      },
      penaltiesApplied: [],
      isOverridden: false,
      evaluatedAt: new Date().toISOString(),
    };

    await expect(ZasmDbStore.saveDeviceTrust(score)).resolves.not.toThrow();
    const list = await ZasmDbStore.listDeviceTrusts();
    expect(Array.isArray(list)).toBe(true);
  });

  it('saves and lists segmentation policies without throwing', async () => {
    const policy: SegmentationPolicyRule = {
      id: 'pol-db-test-01',
      name: 'DB Test Policy',
      priority: 50,
      action: 'ALLOW',
      targetTrustTiers: ['HIGH_TRUST'],
      enabled: true,
    };

    await expect(ZasmDbStore.savePolicy(policy)).resolves.not.toThrow();
    const list = await ZasmDbStore.listPolicies();
    expect(Array.isArray(list)).toBe(true);
  });

  it('saves and lists certificates, SBOM scans, and forensic reports without throwing', async () => {
    const cert: IssuedCertificate = {
      serialNumber: 'TEST-SERIAL-DB-01',
      certificatePem: 'PEM',
      publicKeyPem: 'PUB',
      subject: { commonName: 'test.internal' },
      issuer: { commonName: 'CA' },
      fingerprintSha256: 'SHA',
      validFrom: new Date().toISOString(),
      validTo: new Date().toISOString(),
      sanList: [],
      type: 'SERVICE_CERT',
      isCa: false,
    };
    await expect(ZasmDbStore.saveCertificate(cert, 'test-svc')).resolves.not.toThrow();
    await expect(ZasmDbStore.markCertificateRevoked('TEST-SERIAL-DB-01', 'KEY_COMPROMISE')).resolves.not.toThrow();
    const certs = await ZasmDbStore.listCertificates();
    expect(Array.isArray(certs)).toBe(true);

    const sbomScan: SbomScanResult = {
      scanId: 'scan-test-01',
      timestamp: new Date().toISOString(),
      totalPackagesScanned: 1,
      vulnerablePackageCount: 0,
      vulnerabilities: [],
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    };
    await expect(ZasmDbStore.saveSbomScan(sbomScan)).resolves.not.toThrow();
    const vulns = await ZasmDbStore.listVulnerabilities();
    expect(Array.isArray(vulns)).toBe(true);

    const report: ForensicInvestigationReport = {
      reportId: 'rep-test-01',
      incidentId: 'inc-test-01',
      primaryActor: 'actor-01',
      executiveSummary: 'Summary',
      technicalDetails: 'Details',
      timeline: [],
      rootCauseGraph: { nodes: [], edges: [] },
      durationMs: 120,
      generatedAt: new Date().toISOString(),
    };
    await expect(ZasmDbStore.saveForensicReport(report)).resolves.not.toThrow();
    const reports = await ZasmDbStore.listForensicReports();
    expect(Array.isArray(reports)).toBe(true);
  });
});
