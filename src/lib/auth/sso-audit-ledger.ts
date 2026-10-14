import crypto from 'crypto';
import { db } from '@/db';
import { ssoAuditLogs } from '@/db/schema';
import { eq, desc, asc } from 'drizzle-orm';

export interface RecordSsoAuditParams {
  institutionId: string;
  providerId?: string | null;
  providerType: 'SAML' | 'OIDC';
  eventType: 'login_success' | 'login_failure' | 'jit_provision' | 'idp_created' | 'idp_updated' | 'test_probe' | string;
  subjectId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class SsoAuditLedger {
  public static computeSha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Appends an immutable, Merkle hash pointer chained audit record for SSO events.
   */
  public static async recordEvent(params: RecordSsoAuditParams): Promise<{ id: string; merkleHash: string }> {
    const existing = await db
      .select()
      .from(ssoAuditLogs)
      .where(eq(ssoAuditLogs.institutionId, params.institutionId))
      .orderBy(desc(ssoAuditLogs.createdAt))
      .limit(1);

    const prevHash = existing.length > 0 ? existing[0].merkleHash : 'GENESIS_SSO_MERKLE_ROOT';
    const createdAt = new Date().toISOString();
    const payloadSignature = `${prevHash}:${params.institutionId}:${params.providerType}:${params.eventType}:${params.subjectId || 'anonymous'}:${createdAt}`;
    const merkleHash = this.computeSha256(payloadSignature);

    const auditId = `aud_sso_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    await db.insert(ssoAuditLogs).values({
      id: auditId,
      institutionId: params.institutionId,
      providerId: params.providerId ?? null,
      providerType: params.providerType,
      eventType: params.eventType,
      subjectId: params.subjectId ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      prevHash,
      merkleHash,
      createdAt,
    });

    return { id: auditId, merkleHash };
  }

  /**
   * Verifies the sequential cryptographic Merkle hash chain for an institution's SSO audit trail.
   */
  public static async verifyChain(institutionId: string): Promise<{ valid: boolean; totalLogs: number; brokenAtId?: string }> {
    const logs = await db
      .select()
      .from(ssoAuditLogs)
      .where(eq(ssoAuditLogs.institutionId, institutionId))
      .orderBy(asc(ssoAuditLogs.createdAt));

    let expectedPrevHash = 'GENESIS_SSO_MERKLE_ROOT';

    for (const log of logs) {
      if (log.prevHash !== expectedPrevHash) {
        return { valid: false, totalLogs: logs.length, brokenAtId: log.id };
      }

      const payloadSignature = `${expectedPrevHash}:${log.institutionId}:${log.providerType}:${log.eventType}:${log.subjectId || 'anonymous'}:${log.createdAt}`;
      const recomputedHash = this.computeSha256(payloadSignature);

      if (recomputedHash !== log.merkleHash) {
        return { valid: false, totalLogs: logs.length, brokenAtId: log.id };
      }

      expectedPrevHash = log.merkleHash;
    }

    return { valid: true, totalLogs: logs.length };
  }
}
