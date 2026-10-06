import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { AgentRegistry } from "@/lib/agents/core/registry";
import { AgentDbStore } from "@/lib/db/agent-store";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (req: Request, session: any) => {
  const tenantId = session?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  const registry = AgentRegistry.getInstance();
  const store = AgentDbStore.getInstance();

  const agents = registry.listAgents(tenantId);
  const runs = await store.listWorkflowRuns(tenantId);
  const activeRunsCount = runs.filter((r) => r.status === "running").length;

  return NextResponse.json({
    agents: agents.map((a) => ({
      id: a.id,
      role: a.role,
      domain: a.domain,
      status: a.status,
      currentLoad: a.currentLoad,
      maxConcurrency: a.maxConcurrency,
      capabilities: a.capabilities,
      permissionScopes: a.permissionScopes,
      institutionId: a.institutionId,
    })),
    meta: {
      totalAgents: agents.length,
      activeRunsCount,
      tenantId,
    },
  });
}, "agent:workflows:view");
