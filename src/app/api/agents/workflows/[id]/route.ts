import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { AgentDbStore } from "@/lib/db/agent-store";
import { parseWorkflowDsl } from "@/lib/agents/workflow/dsl/parser";
import { validateWorkflowDsl } from "@/lib/agents/workflow/dsl/validator";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (req: Request, session: any, context?: any) => {
  const params = await context?.params;
  const workflowId = params?.id;
  const tenantId = session?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  if (!workflowId) {
    return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
  }

  const store = AgentDbStore.getInstance();
  const workflow = await store.getWorkflowById(workflowId, tenantId);

  if (!workflow) {
    return NextResponse.json({ error: `Workflow '${workflowId}' not found` }, { status: 404 });
  }

  return NextResponse.json({ workflow });
}, "agent:workflows:view");

export const PATCH = requireAuth(async (req: Request, session: any, context?: any) => {
  const params = await context?.params;
  const workflowId = params?.id;
  const tenantId = session?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  if (!workflowId) {
    return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
  }

  const store = AgentDbStore.getInstance();
  const existing = await store.getWorkflowById(workflowId, tenantId);
  if (!existing) {
    return NextResponse.json({ error: `Workflow '${workflowId}' not found` }, { status: 404 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.definitionJson || body.steps) {
    const parseResult = parseWorkflowDsl(body.definitionJson || body);
    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        { error: "Workflow DSL validation failed", details: parseResult.errors },
        { status: 400 }
      );
    }
    const validation = validateWorkflowDsl(parseResult.data);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Workflow DAG structure validation failed", errors: validation.errors },
        { status: 400 }
      );
    }
  }

  const updated = await store.updateWorkflow(
    workflowId,
    {
      ...body,
      definitionJson: body.definitionJson ? (typeof body.definitionJson === "string" ? body.definitionJson : JSON.stringify(body.definitionJson)) : undefined,
      version: (existing.version || 1) + 1,
    },
    tenantId
  );

  return NextResponse.json({ workflow: updated });
}, "agent:workflows:manage");

export const DELETE = requireAuth(async (req: Request, session: any, context?: any) => {
  const params = await context?.params;
  const workflowId = params?.id;
  const tenantId = session?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  if (!workflowId) {
    return NextResponse.json({ error: "Workflow ID required" }, { status: 400 });
  }

  const store = AgentDbStore.getInstance();
  const existing = await store.getWorkflowById(workflowId, tenantId);
  if (!existing) {
    return NextResponse.json({ error: `Workflow '${workflowId}' not found` }, { status: 404 });
  }

  const deleted = await store.deleteWorkflow(workflowId, tenantId);
  return NextResponse.json({ success: deleted, message: `Workflow '${workflowId}' deleted.` });
}, "agent:workflows:manage");
