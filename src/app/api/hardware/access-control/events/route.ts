import { NextResponse } from "next/server";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { hardwareAccessEvents } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (request: Request, session) => {
  try {
    const institutionId = await resolveRequestInstitution(session);
    const { searchParams } = new URL(request.url);

    const deviceId = searchParams.get("deviceId");
    const zoneId = searchParams.get("zoneId");
    const eventType = searchParams.get("eventType");
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const conditions = [eq(hardwareAccessEvents.institutionId, institutionId)];

    if (deviceId) conditions.push(eq(hardwareAccessEvents.deviceId, deviceId));
    if (zoneId) conditions.push(eq(hardwareAccessEvents.zoneId, zoneId));
    if (eventType) conditions.push(eq(hardwareAccessEvents.eventType, eventType));

    const events = await db
      .select()
      .from(hardwareAccessEvents)
      .where(and(...conditions))
      .orderBy(desc(hardwareAccessEvents.timestamp))
      .limit(limit);

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("[GateAccess] Error listing access events:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list access events" },
      { status: 500 }
    );
  }
}, "hardware:access:read");
