import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { isWorkflowStudioEnabled } from "@/lib/features";
import { WorkflowStudioStore } from "@/lib/workflow-studio/graph-store";
import { workflowGraphUpdateSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = requireAuth(async (req: Request, session: any, context?: any) => {
  const params = await context?.params;
  const graphId = params?.id;
  const tenantId = session?.institutionId || "global";

  if (!isWorkflowStudioEnabled(tenantId)) {
    return NextResponse.json({ error: "Workflow Studio feature is disabled" }, { status: 403 });
  }

  if (!graphId) {
    return NextResponse.json({ error: "Graph ID required" }, { status: 400 });
  }

  const store = WorkflowStudioStore.getInstance();
  const graph = await store.getGraphById(graphId, tenantId);
  if (!graph) {
    return NextResponse.json({ error: "Graph not found" }, { status: 404 });
  }

  return NextResponse.json({ graph });
}, "workflow_studio:read");

export const PATCH = requireAuth(async (req: Request, session: any, context?: any) => {
  const params = await context?.params;
  const graphId = params?.id;
  const tenantId = session?.institutionId || "global";

  if (!isWorkflowStudioEnabled(tenantId)) {
    return NextResponse.json({ error: "Workflow Studio feature is disabled" }, { status: 403 });
  }

  if (!graphId) {
    return NextResponse.json({ error: "Graph ID required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = workflowGraphUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 }
    );
  }

  const store = WorkflowStudioStore.getInstance();
  const result = await store.updateGraph(graphId, tenantId, parsed.data);
  if (result.errors.length > 0 || !result.graph) {
    return NextResponse.json(
      { error: result.errors.includes("Graph not found") ? "Graph not found" : "Graph compilation failed", details: result.errors },
      { status: result.errors.includes("Graph not found") ? 404 : 400 }
    );
  }

  return NextResponse.json({ graph: result.graph });
}, "workflow_studio:design");

export const DELETE = requireAuth(async (req: Request, session: any, context?: any) => {
  const params = await context?.params;
  const graphId = params?.id;
  const tenantId = session?.institutionId || "global";

  if (!isWorkflowStudioEnabled(tenantId)) {
    return NextResponse.json({ error: "Workflow Studio feature is disabled" }, { status: 403 });
  }

  if (!graphId) {
    return NextResponse.json({ error: "Graph ID required" }, { status: 400 });
  }

  const store = WorkflowStudioStore.getInstance();
  const deleted = await store.deleteGraph(graphId, tenantId);
  if (!deleted) {
    return NextResponse.json({ error: "Graph not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}, "workflow_studio:design");
