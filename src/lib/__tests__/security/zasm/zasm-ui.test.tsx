import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZeroTrustMetricsCard } from '@/components/security/zasm/zero-trust-metrics-card';
import { DeviceTrustMatrixTable } from '@/components/security/zasm/device-trust-matrix-table';
import { DeviceOverrideDialog } from '@/components/security/zasm/device-override-dialog';
import { SegmentationPolicyTable } from '@/components/security/zasm/segmentation-policy-table';
import { CertificateLifecycleTable } from '@/components/security/zasm/certificate-lifecycle-table';
import { SbomVulnerabilityViewer } from '@/components/security/zasm/sbom-vulnerability-viewer';
import { LicenseComplianceCard } from '@/components/security/zasm/license-compliance-card';
import { ForensicCopilotPanel } from '@/components/security/zasm/forensic-copilot-panel';

describe('ZASM UI Component Suite (All 8 Components & States)', () => {
  // 1. ZeroTrustMetricsCard
  it('1. renders ZeroTrustMetricsCard with provided metrics', () => {
    render(
      <ZeroTrustMetricsCard
        metrics={{
          totalMtlsHandshakes: 42,
          totalRotations: 3,
          totalVulnerabilities: 2,
          avgForensicDurationSec: 0.12,
        }}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('0.12s')).toBeInTheDocument();
    expect(screen.getByText('mTLS Handshakes')).toBeInTheDocument();
  });

  // 2. DeviceTrustMatrixTable
  it('2a. renders DeviceTrustMatrixTable with populated devices', () => {
    const devices = [
      {
        id: 'd1',
        deviceId: 'macbook-dev-01',
        score: 92,
        tier: 'HIGH_TRUST',
        isOverridden: false,
        evaluatedAt: new Date().toISOString(),
      },
    ];

    render(<DeviceTrustMatrixTable devices={devices} onApplyOverride={jest.fn()} />);
    expect(screen.getByText('macbook-dev-01')).toBeInTheDocument();
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('High Trust')).toBeInTheDocument();
  });

  it('2b. renders DeviceTrustMatrixTable empty state', () => {
    render(<DeviceTrustMatrixTable devices={[]} onApplyOverride={jest.fn()} />);
    expect(screen.getByText('No active device trust records found.')).toBeInTheDocument();
  });

  // 3. DeviceOverrideDialog
  it('3. renders DeviceOverrideDialog when open and handles submit', async () => {
    const onApply = jest.fn().mockResolvedValue(undefined);
    render(
      <DeviceOverrideDialog
        isOpen={true}
        onClose={jest.fn()}
        deviceId="test-device-99"
        onApplyOverride={onApply}
      />
    );

    expect(screen.getByText('Override Device Trust Score')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test-device-99')).toBeInTheDocument();
  });

  // 4. SegmentationPolicyTable
  it('4a. renders SegmentationPolicyTable with populated rules', () => {
    const policies = [
      {
        id: 'pol-1',
        name: 'Academic Isolation Rule',
        priority: 10,
        action: 'ALLOW',
        targetTrustTiers: ['HIGH_TRUST'],
        vlanTag: 10,
        enabled: true,
      },
    ];

    render(<SegmentationPolicyTable policies={policies} />);
    expect(screen.getByText('Academic Isolation Rule')).toBeInTheDocument();
    expect(screen.getByText('Allow')).toBeInTheDocument();
    expect(screen.getByText('VLAN 10')).toBeInTheDocument();
  });

  it('4b. renders SegmentationPolicyTable empty state', () => {
    render(<SegmentationPolicyTable policies={[]} />);
    expect(screen.getByText('No micro-segmentation policies defined.')).toBeInTheDocument();
  });

  // 5. CertificateLifecycleTable
  it('5a. renders CertificateLifecycleTable with active certificates', () => {
    const certs = [
      {
        serialNumber: 'SN-12345678',
        serviceName: 'finance-service',
        type: 'SERVICE_CERT',
        validTo: new Date().toISOString(),
        isRevoked: false,
      },
    ];

    render(
      <CertificateLifecycleTable
        certificates={certs}
        onRotate={jest.fn()}
        onRevoke={jest.fn()}
      />
    );
    expect(screen.getByText('SN-12345678')).toBeInTheDocument();
    expect(screen.getByText('finance-service')).toBeInTheDocument();
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('5b. renders CertificateLifecycleTable empty state', () => {
    render(
      <CertificateLifecycleTable
        certificates={[]}
        onRotate={jest.fn()}
        onRevoke={jest.fn()}
      />
    );
    expect(screen.getByText('No active X.509 certificates found.')).toBeInTheDocument();
  });

  // 6. SbomVulnerabilityViewer
  it('6a. renders SbomVulnerabilityViewer with vulnerabilities', () => {
    const vulns = [
      {
        id: 'CVE-2026-9999',
        packageName: 'insecure-package',
        affectedVersions: '<2.0.0',
        patchedVersion: '2.0.0',
        severity: 'HIGH',
        summary: 'Remote Code Execution vulnerability',
      },
    ];

    render(
      <SbomVulnerabilityViewer
        vulnerabilities={vulns}
        scanning={false}
        onTriggerScan={jest.fn()}
      />
    );
    expect(screen.getByText('CVE-2026-9999')).toBeInTheDocument();
    expect(screen.getByText('insecure-package')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('6b. renders SbomVulnerabilityViewer empty clean state', () => {
    render(
      <SbomVulnerabilityViewer
        vulnerabilities={[]}
        scanning={false}
        onTriggerScan={jest.fn()}
      />
    );
    expect(screen.getByText('Zero known supply chain vulnerabilities detected.')).toBeInTheDocument();
  });

  // 7. LicenseComplianceCard
  it('7a. renders LicenseComplianceCard with compliant state', () => {
    render(
      <LicenseComplianceCard
        licenseAudit={{
          totalAudited: 15,
          compliantCount: 15,
          nonCompliantCount: 0,
        }}
      />
    );
    expect(screen.getByText('100% Compliant')).toBeInTheDocument();
    expect(screen.getByText('15 packages')).toBeInTheDocument();
  });

  it('7b. renders LicenseComplianceCard with copyleft risk state', () => {
    render(
      <LicenseComplianceCard
        licenseAudit={{
          totalAudited: 10,
          compliantCount: 8,
          nonCompliantCount: 2,
        }}
      />
    );
    expect(screen.getByText('2 Copyleft Risk')).toBeInTheDocument();
  });

  // 8. ForensicCopilotPanel
  it('8a. renders ForensicCopilotPanel with reports', () => {
    const reports = [
      {
        reportId: 'rep-01',
        incidentId: 'inc-99',
        primaryActor: 'bad-actor-ip',
        executiveSummary: 'Detected multi-stage attack from bad actor.',
        durationMs: 45,
        timeline: [
          {
            sequenceNumber: 1,
            layer: 'DEVICE_TRUST',
            stage: 'INITIAL_ACCESS',
            description: 'Impossible travel anomaly',
            severity: 'HIGH',
          },
        ],
        rootCauseGraph: {
          nodes: [{ id: 'n1', label: 'Actor', type: 'ACTOR' }],
          edges: [],
        },
      },
    ];

    render(
      <ForensicCopilotPanel
        reports={reports}
        analyzing={false}
        onRunDemoAnalysis={jest.fn()}
      />
    );
    expect(screen.getByText(/Incident inc-99/)).toBeInTheDocument();
    expect(screen.getByText('Detected multi-stage attack from bad actor.')).toBeInTheDocument();
    expect(screen.getByText('Impossible travel anomaly')).toBeInTheDocument();
  });

  it('8b. renders ForensicCopilotPanel empty state', () => {
    render(
      <ForensicCopilotPanel
        reports={[]}
        analyzing={false}
        onRunDemoAnalysis={jest.fn()}
      />
    );
    expect(screen.getByText(/No forensic investigations active/)).toBeInTheDocument();
  });
});
