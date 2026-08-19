import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { DatabaseHealer } from "@/lib/agents/healing/database-healer";

export const POST = requireAuth(async (request, session) => {
  try {
    const { agentType } = await request.json();
    if (!agentType) {
      return NextResponse.json({ error: "Missing agentType parameter" }, { status: 400 });
    }

    if (agentType === "database-healer") {
      const healer = new DatabaseHealer();
      // Run health check in background asynchronously, or await it
      await healer.checkHealth();
      return NextResponse.json({ success: true, message: "Database healer diagnostics triggered successfully." });
    } else {
      return NextResponse.json({ error: `Unsupported agent type: ${agentType}` }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, "agents:manage");
