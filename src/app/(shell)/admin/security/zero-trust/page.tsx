'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Shield, Network, KeyRound, Cpu } from 'lucide-react';
import { useZeroTrustMesh } from '@/lib/hooks/use-zero-trust-mesh';
import { useSbomScanner } from '@/lib/hooks/use-sbom-scanner';
import { useForensicCopilot } from '@/lib/hooks/use-forensic-copilot';
import { ZeroTrustMetricsCard } from '@/components/security/zasm/zero-trust-metrics-card';
import { DeviceTrustMatrixTable } from '@/components/security/zasm/device-trust-matrix-table';
import { SegmentationPolicyTable } from '@/components/security/zasm/segmentation-policy-table';
import { CertificateLifecycleTable } from '@/components/security/zasm/certificate-lifecycle-table';
import { SbomVulnerabilityViewer } from '@/components/security/zasm/sbom-vulnerability-viewer';
import { LicenseComplianceCard } from '@/components/security/zasm/license-compliance-card';
import { ForensicCopilotPanel } from '@/components/security/zasm/forensic-copilot-panel';

export default function ZeroTrustDashboardPage() {
  const {
    devices,
    policies,
    certificates,
    metrics,
    loading: meshLoading,
    error: meshError,
    overrideDeviceTrust,
    rotateCertificate,
    revokeCertificate,
  } = useZeroTrustMesh();

  const {
    vulnerabilities,
    scanning,
    lastScanResult,
    triggerScan,
  } = useSbomScanner();

  const {
    reports,
    analyzing,
    runAnalysis,
  } = useForensicCopilot();

  const handleDemoAnalysis = async () => {
    const sampleSignals = [
      {
        id: 'demo-sig-1',
        sourceLayer: 'DEVICE_TRUST',
        targetActorOrEntity: 'laptop-finance-09',
        eventType: 'IMPOSSIBLE_TRAVEL_ANOMALY',
        severity: 'HIGH',
        details: { distanceKm: 4200, elapsedMinutes: 10 },
        timestamp: new Date(Date.now() - 300000).toISOString(),
      },
      {
        id: 'demo-sig-2',
        sourceLayer: 'AUTH_LOG',
        targetActorOrEntity: 'laptop-finance-09',
        eventType: 'AUTH_FAIL_BURST',
        severity: 'HIGH',
        details: { attempts: 15 },
        timestamp: new Date(Date.now() - 240000).toISOString(),
      },
      {
        id: 'demo-sig-3',
        sourceLayer: 'MICRO_SEGMENTATION',
        targetActorOrEntity: 'laptop-finance-09',
        eventType: 'PORT_SCAN_QUARANTINED',
        severity: 'CRITICAL',
        details: { vlan: 99 },
        timestamp: new Date(Date.now() - 180000).toISOString(),
      },
    ];

    await runAnalysis(sampleSignals);
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Zero-Trust Mesh & Autonomous Security Radar (ZASM)"
        description="Real-time device trust scoring, dynamic micro-segmentation, PKI mTLS mesh, SBOM vulnerability auditing, and automated forensic root-cause analysis."
      />

      {meshError && (
        <Alert variant="error">
          <span className="font-semibold mr-1">Mesh Sync Warning:</span>
          {meshError}
        </Alert>
      )}

      {/* Top Metrics Row */}
      {meshLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
      ) : (
        <ZeroTrustMetricsCard metrics={metrics} />
      )}

      {/* 4-Tab Main Layout */}
      <Tabs defaultValue="devices" className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 gap-1">
          <TabsTrigger value="devices" className="flex items-center gap-2 py-2">
            <Shield className="h-4 w-4" />
            <span>Device Posture</span>
          </TabsTrigger>
          <TabsTrigger value="segmentation" className="flex items-center gap-2 py-2">
            <Network className="h-4 w-4" />
            <span>Micro-Segmentation</span>
          </TabsTrigger>
          <TabsTrigger value="pki" className="flex items-center gap-2 py-2">
            <KeyRound className="h-4 w-4" />
            <span>PKI & mTLS Mesh</span>
          </TabsTrigger>
          <TabsTrigger value="supply-chain" className="flex items-center gap-2 py-2">
            <Cpu className="h-4 w-4" />
            <span>Supply Chain & Forensics</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Device Posture & Trust Matrix */}
        <TabsContent value="devices" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Continuous Device Posture & Trust Matrix</h2>
            <p className="text-xs text-muted-foreground">
              Multi-factor composite 0–100 trust scoring with dynamic behavioral penalties and administrative override controls.
            </p>
          </div>
          {meshLoading ? (
            <Skeleton className="h-64 rounded-lg" />
          ) : (
            <DeviceTrustMatrixTable devices={devices} onApplyOverride={overrideDeviceTrust} />
          )}
        </TabsContent>

        {/* Tab 2: Micro-Segmentation Policies */}
        <TabsContent value="segmentation" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Dynamic Micro-Segmentation Policy Engine</h2>
            <p className="text-xs text-muted-foreground">
              Default-deny trust tier enforcement with automated campus switch VLAN steering and iptables isolation.
            </p>
          </div>
          {meshLoading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : (
            <SegmentationPolicyTable policies={policies} />
          )}
        </TabsContent>

        {/* Tab 3: PKI & Continuous mTLS Mesh */}
        <TabsContent value="pki" className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Internal PKI & Continuous mTLS Mesh</h2>
            <p className="text-xs text-muted-foreground">
              Zero-downtime automated certificate rotation and distributed revocation mesh across all internal microservices.
            </p>
          </div>
          {meshLoading ? (
            <Skeleton className="h-56 rounded-lg" />
          ) : (
            <CertificateLifecycleTable
              certificates={certificates}
              onRotate={rotateCertificate}
              onRevoke={revokeCertificate}
            />
          )}
        </TabsContent>

        {/* Tab 4: Supply Chain, SBOM & Forensics */}
        <TabsContent value="supply-chain" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SbomVulnerabilityViewer
                vulnerabilities={vulnerabilities}
                scanning={scanning}
                onTriggerScan={triggerScan}
              />
            </div>
            <div>
              <LicenseComplianceCard licenseAudit={lastScanResult?.licenseAudit} />
            </div>
          </div>

          <div className="pt-4 border-t">
            <ForensicCopilotPanel
              reports={reports}
              analyzing={analyzing}
              onRunDemoAnalysis={handleDemoAnalysis}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
