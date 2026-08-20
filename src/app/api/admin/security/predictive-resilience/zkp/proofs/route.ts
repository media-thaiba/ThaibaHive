/**
 * Admin ZKP Proofs List Route
 * Sprint-042 (ARES) — ARES-020
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-guard';
import { withDPoP } from '@/lib/identity/dpop-middleware';
import { ZkAttestationService } from '@/lib/security/zkp/zk-attestation-service';
import { AresDbStore } from '@/lib/security/ares/ares-db-store';

export const GET = withDPoP(
  requireAuth(async () => {
    const service = ZkAttestationService.getInstance();
    const store = AresDbStore.getInstance();

    const proofs = await store.listZkpProofs(25);
    const attestations = service.listAttestations();

    return NextResponse.json({
      proofs: proofs.length > 0 ? proofs : service.listProofs(),
      attestations,
    });
  }, 'system:security:audit'),
  { required: false }
);
