import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { remediationTriggerSchema } from "@/lib/validation/schemas";
import { remediationRuntime } from "@/lib/ai/remediation/runtime";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/remediation/trigger
 * Initiates autonomous multi-step remediation workflow with typed tools, HITL gates, and Merkle auditing.
 */
export const POST = requireAuth(async (request: Request, session) => {
  const institutionId = await resolveRequestInstitution(session);

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = remediationTriggerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { planId, name, description, triggerType, steps } = parsed.data;

  const result = await remediationRuntime.executePlan(
    {
      id: planId || `plan_${Date.now()}`,
      name,
      description: description || "Autonomous Copilot Remediation Plan",
      triggerType,
      steps,
    },
    {
      institutionId,
      staffId: session.staffId,
      stepUpFreshnessSeconds: 120, // Default active session freshness
    }
  );

  return NextResponse.json({
    success: true,
    result,
  });
}, "ai:remediation:trigger");
