import { NextResponse } from "next/server";
import { db } from "@/db";
import { vehicleLogs, vehicles } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { eq, and, desc, isNull } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`fleet:checkin:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { vehicleId, action, startOdometer, endOdometer, route } = body;

  if (!vehicleId || !action || !["start_trip", "end_trip"].includes(action)) {
    return NextResponse.json({ error: "Invalid trip check-in parameters" }, { status: 400 });
  }

  if (!session.staffId) {
    return NextResponse.json(
      { error: "A valid driver staff profile is required for fleet check-in" },
      { status: 400 }
    );
  }

  // Scoping check
  const scopedInstId = await resolveRequestInstitution(session, null);
  const vehicle = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId)).get();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  if (scopedInstId !== "global" && vehicle.institutionId && vehicle.institutionId !== scopedInstId) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const serverDate = now.split("T")[0];

  if (action === "start_trip") {
    const log = await db
      .insert(vehicleLogs)
      .values({
        id: crypto.randomUUID(),
        vehicleId,
        driverId: session.staffId,
        date: serverDate,
        startOdometer: startOdometer ?? 0,
        route: route || "Campus Route",
        notes: `Trip started at ${now}`,
      })
      .returning()
      .get();

    await logActivity({
      request,
      action: "create",
      resourceType: "vehicle_log",
      resourceId: log.id,
      staffId: session.staffId,
      details: { action: "start_trip", vehicleId, startOdometer },
    });

    return NextResponse.json({ success: true, status: "in_use", log, serverTime: now });
  } else {
    // End trip: update the most recent open log for this driver and vehicle
    const activeLog = await db
      .select()
      .from(vehicleLogs)
      .where(
        and(
          eq(vehicleLogs.vehicleId, vehicleId),
          eq(vehicleLogs.driverId, session.staffId),
          isNull(vehicleLogs.endOdometer)
        )
      )
      .orderBy(desc(vehicleLogs.createdAt))
      .get();

    let updatedLog = activeLog;
    if (activeLog && endOdometer !== undefined && endOdometer !== null) {
      const distance = activeLog.startOdometer !== null ? Math.max(0, endOdometer - activeLog.startOdometer) : null;
      updatedLog = await db
        .update(vehicleLogs)
        .set({
          endOdometer,
          distanceKm: distance,
          notes: `${activeLog.notes || ""}\nTrip ended at ${now}`.trim(),
        })
        .where(eq(vehicleLogs.id, activeLog.id))
        .returning()
        .get();
    }

    await logActivity({
      request,
      action: "update",
      resourceType: "vehicle_log",
      resourceId: activeLog?.id || vehicleId,
      staffId: session.staffId,
      details: { action: "end_trip", vehicleId, endOdometer },
    });

    return NextResponse.json({ success: true, status: "available", log: updatedLog, serverTime: now });
  }
}, "vehicles:manage");
