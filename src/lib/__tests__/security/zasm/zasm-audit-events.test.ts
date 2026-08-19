import { ZasmAuditLogger } from '@/lib/security/zasm/zasm-audit-events';
import { DeviceTrustScore } from '@/lib/security/trust/trust-types';
import { db } from '@/db';
import { auditLogs } from '@thaiba/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuditChain } from '@/lib/audit/crypto-audit-engine';

describe('ZasmAuditLogger', () => {
  it('logs device trust evaluation and certificate events with Merkle chain persistence', async () => {
    const testDeviceId = `dev-audit-${Date.now()}`;
    const score: DeviceTrustScore = {
      deviceId: testDeviceId,
      tenantId: 'tenant-audit',
      score: 95,
      tier: 'HIGH_TRUST',
      factorBreakdown: {
        osAndPatchScore: 25,
        endpointComplianceScore: 20,
        dpopBindingScore: 20,
        authStrengthScore: 15,
        geoRiskScore: 5,
        behavioralStabilityScore: 10,
      },
      penaltiesApplied: [],
      isOverridden: false,
      evaluatedAt: new Date().toISOString(),
    };

    await ZasmAuditLogger.logTrustEvaluated(score);

    const loggedEntries = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, testDeviceId));

    expect(loggedEntries.length).toBeGreaterThan(0);
    expect(loggedEntries[0].action).toBe('ZASM_TRUST_EVALUATED');
    expect(loggedEntries[0].currentHash).toBeDefined();

    // Verify cryptographic integrity of logged entries
    const verification = verifyAuditChain(loggedEntries as any);
    expect(verification.valid).toBe(true);
  });
});
