import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { CaEngine } from '@/lib/security/pki/ca-engine';
import { CrlManager } from '@/lib/security/pki/crl-manager';
import { CertMeshSync } from '@/lib/security/mesh/cert-mesh-sync';
import { certificateRevokeSchema } from '@/lib/validation/zasm-schemas';
import { ZasmAuditLogger } from '@/lib/security/zasm/zasm-audit-events';
import { ZasmDbStore } from '@/lib/security/zasm/zasm-db-store';

export const GET = withDPoP(
  requireAuth(async () => {
    const certificates = CaEngine.getInstance().listIssuedCertificates();
    const revocations = CrlManager.getInstance().listRevocations();
    return NextResponse.json({ certificates, revocations });
  }, 'system:security:view'),
  { required: false }
);

export const POST = withDPoP(
  requireAuth(async (req: Request) => {
    try {
      const body = await req.json();
      const parsed = certificateRevokeSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
      }

      const { serialNumber, reason } = parsed.data;
      const event = CertMeshSync.getInstance().publishRevocation(serialNumber, reason);
      await ZasmDbStore.markCertificateRevoked(serialNumber, reason);
      await ZasmAuditLogger.logCertRevoked({
        serialNumber,
        revokedAt: event.timestamp,
        reason,
        revokedBy: 'admin',
      });

      return NextResponse.json({ success: true, message: `Certificate ${serialNumber} revoked`, event });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
  }, 'system:security:rotate'),
  { required: false }
);
