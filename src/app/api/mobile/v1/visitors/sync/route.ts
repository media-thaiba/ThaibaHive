import { NextResponse } from "next/server";
import { db } from "@/db";
import { gateLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { logs } = body as {
    logs: {
      passId?: string;
      actionType: string;
      visitorName: string;
      timestamp: string;
      deviceId?: string;
    }[];
  };

  if (!Array.isArray(logs)) {
    return NextResponse.json({ error: "Invalid sync logs array" }, { status: 400 });
  }

  const processedIds: string[] = [];

  for (const logItem of logs) {
    const id = crypto.randomUUID();
    await db
      .insert(gateLogs)
      .values({
        id,
        institutionId: "inst_001",
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
