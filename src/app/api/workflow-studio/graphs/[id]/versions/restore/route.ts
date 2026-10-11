import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { isWorkflowStudioEnabled } from "@/lib/features";
import { WorkflowStudioStore } from "@/lib/workflow-studio/graph-store";
import { workflowGraphVersionRestoreSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = requireAuth(async (req: Request, session: any, context?: any) => {
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

  const parsed = workflowGraphVersionRestoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 }
    );
  }

  const store = WorkflowStudioStore.getInstance();
  const result = await store.restoreVersion(graphId, tenantId, parsed.data.version);

  if (result.errors.length > 0 || !result.graph) {
    const notFound = result.errors.some((e) => e.includes("not found"));
    return NextResponse.json(
      {
        error: notFound ? result.errors[0] : "Graph compilation failed",
        details: result.errors,
      },
      { status: notFound ? 404 : 400 }
    );
  }

  return NextResponse.json({ graph: result.graph, restoredFrom: result.restoredFrom });
}, "workflow_studio:design");
