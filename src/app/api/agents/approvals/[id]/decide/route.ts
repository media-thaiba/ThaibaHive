import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { ApprovalGateEngine } from "@/lib/agents/approvals/approval-engine";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export const POST = requireAuth(async (req: Request, user: any, context?: any) => {
  const params = await context?.params;
  const gateId = params?.id;
  const tenantId = user?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  if (!gateId) {
    return NextResponse.json({ error: "Approval Gate ID required" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const decision = body.decision;
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "Decision must be 'approved' or 'rejected'" }, { status: 400 });
  }

  const approverId = user?.staffId || user?.userId || "unknown_approver";
  const reason = body.reason || `Decided by ${user?.role || "approver"}`;

  const engine = ApprovalGateEngine.getInstance();
  const result = await engine.decideGate(gateId, decision, approverId, reason, tenantId);

  if (result.status === "conflict") {
    return NextResponse.json(
      { error: result.error || "Approval conflict: gate has already been resolved or expired.", result },
      { status: 409 }
    );
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to process decision", result }, { status: 400 });
  }

  return NextResponse.json({ result });
}, "agent:workflows:approve");
