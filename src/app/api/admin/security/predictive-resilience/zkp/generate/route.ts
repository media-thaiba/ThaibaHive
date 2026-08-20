/**
 * Admin ZKP Proof Generation Route
 * Sprint-042 (ARES) — ARES-020
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { ZkAttestationService } from '@/lib/security/zkp/zk-attestation-service';
import { AresDbStore } from '@/lib/security/ares/ares-db-store';
import { AresAuditLogger } from '@/lib/security/ares/ares-audit-events';
import { zkpGenerateProofSchema } from '@/lib/validation/ares-schemas';

export const POST = withDPoP(
  requireAuth(async (req: Request) => {
    const body = await req.json();
    const parsed = zkpGenerateProofSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { merkleRoot, auditRecordPreimage, tenantId } = parsed.data;
    const attestationService = ZkAttestationService.getInstance();
    const store = AresDbStore.getInstance();

    const proof = attestationService.generateAndStoreProof(merkleRoot, auditRecordPreimage, tenantId);
    await store.saveZkpProof(proof);

    await AresAuditLogger.logEvent('ZKP_PROOF_GENERATED', proof.proofId, {
      merkleRoot: proof.merkleRoot,
      leafHash: proof.leafHashCommitment,
    });

    return NextResponse.json({ proof });
  }, 'system:security:audit'),
  { required: false }
);
