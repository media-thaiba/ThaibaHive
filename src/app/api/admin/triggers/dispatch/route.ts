import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/api/auth-guard";
import { defaultNotificationRouter } from "../../../../../lib/notifications/automated-notification-router";
import { TriggerEvaluationResult } from "../../../../../lib/triggers/trigger-evaluation-engine";

export const POST = requireAuth(async (request: Request) => {
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { tenantId = "tenant-main", triggerResult } = body as { tenantId?: string; triggerResult?: TriggerEvaluationResult };

  if (!triggerResult) {
    return NextResponse.json({ error: "Missing triggerResult payload" }, { status: 400 });
  }

  try {
    const logRecord = await defaultNotificationRouter.dispatchNotification(tenantId, triggerResult);
    return NextResponse.json(
      {
        message: "Notification dispatch executed",
        dispatchLog: logRecord,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to dispatch notification" },
      { status: 500 }
    );
  }
}, "triggers:manage");

export const GET = requireAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get("tenantId") || "tenant-main";

  try {
    const logs = defaultNotificationRouter.getDispatchLogs(tenantId);
    return NextResponse.json({ tenantId, logsCount: logs.length, logs }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retrieve dispatch logs" },
      { status: 500 }
    );
  }
}, "triggers:manage");
