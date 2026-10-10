import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { remediationApproveSchema } from "@/lib/validation/schemas";
import { remediationRuntime } from "@/lib/ai/remediation/runtime";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/remediation/approve
 * Human-in-the-loop decision endpoint for remediation approval gates with D12 Step-Up auth freshness.
 */
export const POST = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = remediationApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { gateId, decision, stepUpFreshnessSeconds = 60 } = parsed.data;

  try {
    const result = await remediationRuntime.resumeGate(
      gateId,
      decision,
      {
        institutionId,
        staffId: session.staffId,
        stepUpFreshnessSeconds,
      }
    );

    return NextResponse.json({
      success: true,
      decision,
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to process approval gate" },
      { status: 400 }
    );
  }
}, "ai:remediation:approve");
