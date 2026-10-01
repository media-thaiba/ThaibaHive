import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { AgentDbStore } from "@/lib/db/agent-store";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (req: Request, user: any) => {
  const tenantId = user?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const runId = searchParams.get("runId") || undefined;
  const status = searchParams.get("status") || undefined;

  const store = AgentDbStore.getInstance();
  const gates = await store.listApprovalGates(tenantId, runId, status);

  return NextResponse.json({
    approvalGates: gates,
    total: gates.length,
  });
}, "agent:workflows:view");
