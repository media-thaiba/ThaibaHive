import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { AgentDbStore } from "@/lib/db/agent-store";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (req: Request, session: any, context?: any) => {
  const params = await context?.params;
  const runId = params?.id;
  const tenantId = session?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  if (!runId) {
    return NextResponse.json({ error: "Run ID is required" }, { status: 400 });
  }

  const store = AgentDbStore.getInstance();
  const run = await store.getWorkflowRunById(runId, tenantId);

  if (!run) {
    return NextResponse.json({ error: `Workflow run '${runId}' not found` }, { status: 404 });
  }

  const steps = await store.listWorkflowSteps(runId, tenantId);
  const approvalGates = await store.listApprovalGates(tenantId, runId);

  return NextResponse.json({
    run,
    steps,
    approvalGates,
  });
}, "agent:workflows:view");
