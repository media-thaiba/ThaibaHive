import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { AgentDbStore } from "@/lib/db/agent-store";
import { parseWorkflowDsl } from "@/lib/agents/workflow/dsl/parser";
import { validateWorkflowDsl } from "@/lib/agents/workflow/dsl/validator";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (req: Request, session: any) => {
  const tenantId = session?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  const store = AgentDbStore.getInstance();
  const workflows = await store.listWorkflows(tenantId, status);

  return NextResponse.json({
    workflows,
    total: workflows.length,
  });
}, "agent:workflows:view");

export const POST = requireAuth(async (req: Request, session: any) => {
  const tenantId = session?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = parseWorkflowDsl(body);
  if (!parseResult.success || !parseResult.data) {
    return NextResponse.json(
      { error: "Workflow DSL validation failed", details: parseResult.errors },
      { status: 400 }
    );
  }

  const dsl = parseResult.data;
  const validation = validateWorkflowDsl(dsl);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Workflow DAG structure validation failed", errors: validation.errors },
      { status: 400 }
    );
  }

  const store = AgentDbStore.getInstance();
  const created = await store.createWorkflow({
    id: dsl.key,
    institutionId: tenantId,
    name: dsl.name,
    description: dsl.description || "",
    version: dsl.version || 1,
    definitionJson: JSON.stringify(dsl),
    status: "active",
    createdBy: session?.staffId || session?.userId || "system",
  });

  return NextResponse.json({ workflow: created }, { status: 201 });
}, "agent:workflows:create");
