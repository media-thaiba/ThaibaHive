import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { isWorkflowStudioEnabled } from "@/lib/features";
import { WorkflowStudioStore } from "@/lib/workflow-studio/graph-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = requireAuth(async (_req: Request, session: any, context?: any) => {
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

  const versions = await store.listVersions(graphId, tenantId);
  return NextResponse.json({
    versions,
    total: versions.length,
    maxVersions: store.maxVersionsPerGraph,
    currentVersion: graph.graphVersion,
  });
}, "workflow_studio:read");
