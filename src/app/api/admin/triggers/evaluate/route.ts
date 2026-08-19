import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/api/auth-guard";
import { defaultTriggerEngine, TriggerRuleDefinition } from "../../../../../lib/triggers/trigger-evaluation-engine";

export const POST = requireAuth(async (request: Request) => {
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { tenantId = "tenant-main", eventType = "absenteeism", eventPayload = {}, customRule } = body as any;

  try {
    if (customRule) {
      defaultTriggerEngine.registerRule(customRule as TriggerRuleDefinition);
    }

    const results = defaultTriggerEngine.evaluateEvent(tenantId, eventType, eventPayload);
    return NextResponse.json(
      {
        message: "Trigger evaluation complete",
        tenantId,
        eventType,
        evaluatedCount: results.length,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to evaluate trigger event" },
      { status: 500 }
    );
  }
}, "triggers:manage");
