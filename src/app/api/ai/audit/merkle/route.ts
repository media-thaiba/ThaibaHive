import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { MerkleAuditLedger } from "@/lib/agents/guardrails/merkle-ledger";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/audit/merkle
 * Verifies cryptographic Merkle hash chain integrity for AI operations in the authenticated tenant.
 */
export const GET = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);
  const ledger = MerkleAuditLedger.getInstance();

  await ledger.flushAll();
  const verification = await ledger.verifyChainIntegrity(institutionId);

  return NextResponse.json({
    success: true,
    verification,
  });
}, "ai:audit:view");
