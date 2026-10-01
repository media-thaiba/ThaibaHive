import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { AgentMemoryStore } from "@/lib/agents/memory/memory-store";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (req: Request, user: any) => {
  const tenantId = user?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const agentId = searchParams.get("agentId");
  const query = searchParams.get("query") || undefined;
  const scope = searchParams.get("scope") as "episodic" | "semantic" | "procedural" | undefined;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

  if (!agentId) {
    return NextResponse.json({ error: "agentId parameter is required" }, { status: 400 });
  }

  const memoryStore = AgentMemoryStore.getInstance();
  const entries = await memoryStore.retrieveRelevantMemories({
    agentId,
    tenantId,
    query,
    scope,
    limit,
  });

  return NextResponse.json({
    entries,
    total: entries.length,
    agentId,
  });
}, "agent:memory:view");

export const POST = requireAuth(async (req: Request, user: any) => {
  const tenantId = user?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { agentId, scope, content, importance, sourceRef } = body;
  if (!agentId || !content) {
    return NextResponse.json({ error: "agentId and content are required" }, { status: 400 });
  }

  const memoryStore = AgentMemoryStore.getInstance();
  const entry = await memoryStore.storeMemory({
    agentId,
    institutionId: tenantId,
    scope: scope || "episodic",
    content,
    importance: importance ?? 1.0,
    sourceRef,
  });

  return NextResponse.json({ entry }, { status: 201 });
}, "agent:memory:manage");
