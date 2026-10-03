import { NextResponse } from "next/server";
import { db } from "@/db";
import { gateLogs } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@thaiba/auth";

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { logs, institutionId: reqInstId } = body as {
    logs: {
      passId?: string;
      actionType: string;
      visitorName: string;
      timestamp: string;
      deviceId?: string;
    }[];
    institutionId?: string;
  };

  if (!Array.isArray(logs)) {
    return NextResponse.json({ error: "Invalid sync logs array" }, { status: 400 });
  }

  const institutionId = await resolveScopedInstitutionId(reqInstId);
  const processedIds: string[] = [];

  for (const logItem of logs) {
    const id = crypto.randomUUID();
    await db
      .insert(gateLogs)
      .values({
        id,
        institutionId,
        passId: logItem.passId || null,
        visitorName: logItem.visitorName,
        actionType: logItem.actionType,
        timestamp: logItem.timestamp || new Date().toISOString(),
        gatekeeperId: session.staffId,
        deviceId: logItem.deviceId || "gate_device_01",
        isOfflineSync: true,
        syncTimestamp: new Date().toISOString(),
      })
      .run();
    processedIds.push(id);
  }

  return NextResponse.json({
    success: true,
    processedCount: processedIds.length,
    processedIds,
    syncedAt: new Date().toISOString(),
  });
}, "visitor:verify");
