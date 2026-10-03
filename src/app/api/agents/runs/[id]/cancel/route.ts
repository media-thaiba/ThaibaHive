import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { AgentDbStore } from "@/lib/db/agent-store";
import { rollbackCoordinator } from "@/lib/agents/guardrails/rollback-coordinator";
import { TenantContext } from "@/lib/agents/tools/contract";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export const POST = requireAuth(async (req: Request, session: any, context?: any) => {
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

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const tenant: TenantContext = {
    institutionId: tenantId,
    userId: session?.staffId || session?.userId || "user_sys",
    userRole: session?.role || "staff",
    permissions: session?.permissions || ["*"],
    traceId: req.headers.get("x-trace-id") || `trace_cancel_${Date.now()}`,
  };

  const rollbackSummary = await rollbackCoordinator.initiateRollback({
    runId,
    tenant,
    reason: body.reason || "Cancelled by administrator",
    requestedBy: session?.staffId || session?.userId || "admin",
  });

  return NextResponse.json({
    runId,
    cancelled: true,
    rollbackSummary,
  });
}, "agent:workflows:manage");
