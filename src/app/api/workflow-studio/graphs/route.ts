import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { isWorkflowStudioEnabled } from "@/lib/features";
import { WorkflowStudioStore } from "@/lib/workflow-studio/graph-store";
import { workflowGraphCreateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = requireAuth(async (req: Request, session: any) => {
  const tenantId = session?.institutionId || "global";

  if (!isWorkflowStudioEnabled(tenantId)) {
    return NextResponse.json({ error: "Workflow Studio feature is disabled" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;

  const store = WorkflowStudioStore.getInstance();
  const graphs = await store.listGraphs(tenantId, status);

  return NextResponse.json({ graphs, total: graphs.length });
}, "workflow_studio:read");

export const POST = requireAuth(async (req: Request, session: any) => {
  const tenantId = session?.institutionId || "global";

  if (!isWorkflowStudioEnabled(tenantId)) {
    return NextResponse.json({ error: "Workflow Studio feature is disabled" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = workflowGraphCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 }
    );
  }

  const { graphName, description, key, canvasState } = parsed.data;
  const store = WorkflowStudioStore.getInstance();
  const result = await store.createGraph({
    institutionId: tenantId,
    graphName,
    description,
    canvasState,
    createdBy: session?.staffId || session?.userId || "system",
    key,
  });

  if (result.errors.length > 0 || !result.graph) {
    return NextResponse.json({ error: "Graph compilation failed", details: result.errors }, { status: 400 });
  }

  return NextResponse.json({ graph: result.graph }, { status: 201 });
}, "workflow_studio:design");
