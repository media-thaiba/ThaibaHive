import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { AgentRegistry } from "@/lib/agents/core/registry";
import { AgentDbStore } from "@/lib/db/agent-store";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (req: Request, session: any, context?: any) => {
  const params = await context?.params;
  const agentId = params?.id;
  const tenantId = session?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  if (!agentId) {
    return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
  }

  const registry = AgentRegistry.getInstance();
  const agent = registry.getAgent(agentId, tenantId);

  if (!agent) {
    return NextResponse.json({ error: `Agent '${agentId}' not found` }, { status: 404 });
  }

  const store = AgentDbStore.getInstance();
  const recentMemory = await store.listMemoryEntries(agentId, tenantId, 10);
  const recentInvocations = (await store.listToolInvocations(tenantId))
    .filter((inv) => inv.agentId === agentId)
    .slice(-10);

  return NextResponse.json({
    agent: {
      id: agent.id,
      role: agent.role,
      domain: agent.domain,
      status: agent.status,
      currentLoad: agent.currentLoad,
      maxConcurrency: agent.maxConcurrency,
      capabilities: agent.capabilities,
      permissionScopes: agent.permissionScopes,
      institutionId: agent.institutionId,
    },
    recentMemory,
    recentInvocations,
  });
}, "agent:workflows:view");
