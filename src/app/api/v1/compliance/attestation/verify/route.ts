/**
 * Public Zero-Knowledge Proof Compliance Attestation Endpoint
 * Sprint-042 (ARES) — ARES-011
 */

import { NextResponse } from 'next/server';
import { ZkAttestationService } from '@/lib/security/zkp/zk-attestation-service';
import { zkpVerifyAttestationSchema } from '@/lib/validation/ares-schemas';
import { withPublicApm } from '@/lib/api/public-apm';

export const POST = withPublicApm(async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = zkpVerifyAttestationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const service = ZkAttestationService.getInstance();
    const { proofId, proofPayload, complianceFramework } = parsed.data;

    let attestation;
    if (proofId) {
      attestation = service.verifyProofAndIssueAttestation(proofId, complianceFramework);
    } else if (proofPayload) {
      attestation = service.verifyExternalProofPayload(proofPayload, complianceFramework);
    }

    if (!attestation) {
      return NextResponse.json({ error: 'Proof not found or verification failed' }, { status: 404 });
    }

    return NextResponse.json({ attestation });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
});
