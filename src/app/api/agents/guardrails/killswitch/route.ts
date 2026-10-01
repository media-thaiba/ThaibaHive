import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { AgentKillSwitch } from "@/lib/agents/guardrails/kill-switch";
import { isAgenticWorkflowsEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (req: Request, user: any) => {
  const tenantId = user?.institutionId || "global";

  if (!isAgenticWorkflowsEnabled(tenantId)) {
    return NextResponse.json({ error: "Agentic workflows feature is disabled" }, { status: 403 });
  }

  const killSwitch = AgentKillSwitch.getInstance();

  return NextResponse.json({
    engaged: killSwitch.isEngaged(tenantId),
    tenantId,
  });
}, "agent:workflows:view");

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

  const { action, confirmationText, reason, sessionAuthenticatedAt } = body;
  const killSwitch = AgentKillSwitch.getInstance();

  const authData = {
    userId: user?.staffId || user?.userId || "unknown",
    userRole: user?.role || "unknown",
    sessionAuthenticatedAt: sessionAuthenticatedAt || (user?.iat ? new Date(user.iat * 1000).toISOString() : new Date().toISOString()),
    confirmationText,
  };

  if (action === "engage") {
    const result = await killSwitch.engage(authData, reason || "Emergency shutdown requested", tenantId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, engaged: true, message: "Emergency kill-switch engaged." });
  } else if (action === "disengage") {
    const result = await killSwitch.disengage(authData, tenantId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, engaged: false, message: "Kill-switch disengaged." });
  }

  return NextResponse.json({ error: "Action must be 'engage' or 'disengage'" }, { status: 400 });
}, "agent:killswitch:engage");
