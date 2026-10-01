import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { AgentDbStore } from "@/lib/db/agent-store";
import { rollbackCoordinator } from "@/lib/agents/guardrails/rollback-coordinator";
import { TenantContext } from "@/lib/agents/tools/contract";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export const POST = requireAuth(async (req: Request, user: any, context?: any) => {
  const params = await context?.params;
  const runId = params?.id;
  const tenantId = user?.institutionId || "global";

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

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const tenant: TenantContext = {
    institutionId: tenantId,
    userId: user?.staffId || user?.userId || "user_sys",
    userRole: user?.role || "staff",
    permissions: user?.permissions || ["*"],
    traceId: req.headers.get("x-trace-id") || `trace_cancel_${Date.now()}`,
  };

  const rollbackSummary = await rollbackCoordinator.initiateRollback({
    runId,
    tenant,
    reason: body.reason || "Cancelled by administrator",
    requestedBy: user?.staffId || user?.userId || "admin",
  });

  return NextResponse.json({
    runId,
    cancelled: true,
    rollbackSummary,
  });
}, "agent:workflows:manage");
