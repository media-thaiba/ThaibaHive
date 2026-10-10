import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { remediationRuntime } from "@/lib/ai/remediation/runtime";

export const dynamic = "force-dynamic";

/**
 * GET /api/ai/remediation/gates
 * Lists pending HITL approval gates for the current institution.
 */
export const GET = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);
  const gates = remediationRuntime.listPendingGates(institutionId);

  return NextResponse.json({
    success: true,
    gates,
  });
}, "ai:remediation:approve");
