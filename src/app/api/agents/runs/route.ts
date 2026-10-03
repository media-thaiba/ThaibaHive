import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { AgentDbStore } from "@/lib/db/agent-store";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (req: Request, session: any) => {
  const tenantId = session?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const workflowId = searchParams.get("workflowId") || undefined;
  const status = searchParams.get("status") || undefined;

  const store = AgentDbStore.getInstance();
  const runs = await store.listWorkflowRuns(tenantId, workflowId, status);

  return NextResponse.json({
    runs,
    total: runs.length,
  });
}, "agent:workflows:view");
