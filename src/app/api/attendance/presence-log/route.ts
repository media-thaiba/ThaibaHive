import { NextResponse } from "next/server";
import { db } from "@/db";
import { presenceLogs, attendanceLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, desc } from "drizzle-orm";

export const POST = requireAuth(async (request, session) => {
  try {
    const body = await request.json();

    // Support single log or bulk upload
    const logs = Array.isArray(body.logs) ? body.logs : [body];

    if (logs.length === 0) {
      return NextResponse.json({ error: "No logs provided" }, { status: 400 });
    }

    const insertedLogs = [];

    for (const log of logs) {
      const {
        attendanceId,
        latitude,
        longitude,
        accuracy,
        isWithinGeofence = true,
        isMockLocation = false,
        wifiSsid,
        verificationMethod = "gps",
        distanceFromOffice,
        networkState = "online",
        batteryLevel,
      } = log;

      // Verify attendance log exists and belongs to this staff
      const attendanceLog = await db
        .select()
        .from(attendanceLogs)
        .where(
          and(
            eq(attendanceLogs.id, attendanceId),
            eq(attendanceLogs.staffId, session.staffId)
          )
        )
        .get();

      if (!attendanceLog) {
        continue; // Skip invalid logs
      }

      // Insert presence log
      const logId = crypto.randomUUID();
      const newLog = await db
        .insert(presenceLogs)
        .values({
          id: logId,
          attendanceId,
          staffId: session.staffId,
          latitude,
          longitude,
          accuracy: accuracy ?? null,
          isWithinGeofence,
          isMockLocation,
          wifiSsid: wifiSsid ?? null,
          verificationMethod,
          distanceFromOffice: distanceFromOffice ?? null,
          networkState,
          batteryLevel: batteryLevel ?? null,
        })
        .returning()
        .get();

      insertedLogs.push(newLog);

      // Update attendance log with presence status
      let presenceStatus = "verified";
      if (isMockLocation) {
        presenceStatus = "unverified";
      } else if (!isWithinGeofence) {
        presenceStatus = "field_work";
      }

      const currentViolations = attendanceLog.geofenceViolations ?? 0;
      const newViolations = !isWithinGeofence ? currentViolations + 1 : currentViolations;

      await db
        .update(attendanceLogs)
        .set({
          presenceStatus,
          lastVerifiedAt: new Date().toISOString(),
          geofenceViolations: newViolations,
        })
        .where(eq(attendanceLogs.id, attendanceId))
        .run();
    }

    return NextResponse.json({ logs: insertedLogs }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const GET = requireAuth(async (request, session) => {
  try {
    const { searchParams } = new URL(request.url);
    const attendanceId = searchParams.get("attendanceId");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = db
      .select()
      .from(presenceLogs)
      .where(eq(presenceLogs.staffId, session.staffId))
      .orderBy(desc(presenceLogs.createdAt))
      .limit(limit);

    if (attendanceId) {
      query = db
        .select()
        .from(presenceLogs)
        .where(
          and(
            eq(presenceLogs.staffId, session.staffId),
            eq(presenceLogs.attendanceId, attendanceId)
          )
        )
        .orderBy(desc(presenceLogs.createdAt))
        .limit(limit);
    }

    const logs = await query.all();
    return NextResponse.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
