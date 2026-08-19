import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { CertRotationManager } from '@/lib/security/pki/cert-rotation-manager';
import { CertMeshSync } from '@/lib/security/mesh/cert-mesh-sync';
import { ZasmAuditLogger } from '@/lib/security/zasm/zasm-audit-events';
import { ZasmDbStore } from '@/lib/security/zasm/zasm-db-store';
import { ZasmMetricsTracker } from '@/lib/security/zasm/zasm-metrics';

export const POST = withDPoP(
  requireAuth(async (_req: Request, _session, context) => {
    try {
      const params = await context?.params;
      const serviceName = params?.id || '';
      const rotationManager = new CertRotationManager();
      rotationManager.registerServiceCertificate(serviceName);

      const result = rotationManager.rotateCertificate(serviceName);
      CertMeshSync.getInstance().publishRotation(serviceName, result.newCert.serialNumber);

      await ZasmDbStore.saveCertificate(result.newCert, serviceName);
      await ZasmAuditLogger.logCertIssued(result.newCert);
      ZasmMetricsTracker.getInstance().recordCertRotation(serviceName, 'SUCCESS');

      return NextResponse.json({
        success: true,
        serviceName,
        newSerialNumber: result.newCert.serialNumber,
        validTo: result.newCert.validTo,
        rotatedAt: result.rotatedAt,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
  }, 'system:security:rotate'),
  { required: false }
);
