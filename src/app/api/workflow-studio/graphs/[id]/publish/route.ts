import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { isWorkflowStudioEnabled, isAgenticWorkflowsEnabled } from "@/lib/features";
import { WorkflowStudioStore } from "@/lib/workflow-studio/graph-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = requireAuth(async (req: Request, session: any, context?: any) => {
  const params = await context?.params;
  const graphId = params?.id;
  const tenantId = session?.institutionId || "global";

  if (!isWorkflowStudioEnabled(tenantId)) {
    return NextResponse.json({ error: "Workflow Studio feature is disabled" }, { status: 403 });
  }
  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  if (!graphId) {
    return NextResponse.json({ error: "Graph ID required" }, { status: 400 });
  }

  const store = WorkflowStudioStore.getInstance();
  const result = await store.publishGraph(graphId, tenantId);

  if (result.errors.length > 0 || !result.graph) {
    const notFound = result.errors.includes("Graph not found");
    return NextResponse.json(
      { error: notFound ? "Graph not found" : "Graph compilation failed", details: result.errors },
      { status: notFound ? 404 : 400 }
    );
  }

  return NextResponse.json({ graph: result.graph, workflowId: result.workflowId });
}, "workflow_studio:publish");
