import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { AgentDbStore } from "@/lib/db/agent-store";
import { WorkflowExecutionEngine } from "@/lib/agents/workflow/engine/execution-engine";
import { TenantContext } from "@/lib/agents/tools/contract";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

// In-memory idempotency cache for execution requests
const idempotencyCache = new Map<string, { result: any; timestamp: number }>();

export const POST = requireAuth(async (req: Request, session: any, context?: any) => {
  const params = await context?.params;
  const workflowId = params?.id;
  const tenantId = session?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  const idempotencyKey = req.headers.get("idempotency-key") || req.headers.get("x-idempotency-key");

  if (!workflowId) {
    return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
  }

  // Idempotency check
  if (idempotencyKey) {
    const cached = idempotencyCache.get(`${tenantId}:${idempotencyKey}`);
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return NextResponse.json({ ...cached.result, idempotencyReplay: true });
    }
  }

  const store = AgentDbStore.getInstance();
  const workflowRecord = await store.getWorkflowById(workflowId, tenantId);

  let dsl: any;
  if (workflowRecord) {
    dsl = typeof workflowRecord.definitionJson === "string" ? JSON.parse(workflowRecord.definitionJson) : workflowRecord.definitionJson;
  } else {
    // If not in DB by ID, check if workflowId matches a registered key
    const allWfs = await store.listWorkflows(tenantId);
    const matched = allWfs.find((w) => w.key === workflowId);
    if (matched) {
      dsl = typeof matched.definitionJson === "string" ? JSON.parse(matched.definitionJson) : matched.definitionJson;
    }
  }

  if (!dsl) {
    return NextResponse.json({ error: `Workflow '${workflowId}' definition not found` }, { status: 404 });
  }

  let triggerContext = {};
  try {
    const body = await req.json();
    triggerContext = body.context || body;
  } catch {}

  const tenant: TenantContext = {
    institutionId: tenantId,
    userId: session?.staffId || session?.userId || "user_sys",
    userRole: session?.role || "staff",
    permissions: session?.permissions || ["*"],
    traceId: req.headers.get("x-trace-id") || `trace_${Date.now()}`,
  };

  const engine = WorkflowExecutionEngine.getInstance();
  const runResult = await engine.startRun(dsl, triggerContext, tenant);

  const responsePayload = {
    runId: runResult.runId,
    workflowKey: runResult.workflowKey,
    status: runResult.status,
    executedStepsCount: runResult.executedSteps.length,
    approvalGateId: runResult.approvalGateId,
    error: runResult.error,
    durationMs: runResult.durationMs,
  };

  if (idempotencyKey) {
    idempotencyCache.set(`${tenantId}:${idempotencyKey}`, {
      result: responsePayload,
      timestamp: Date.now(),
    });
  }

  return NextResponse.json(responsePayload, { status: runResult.status === "failed" ? 500 : 200 });
}, "agent:workflows:execute");
