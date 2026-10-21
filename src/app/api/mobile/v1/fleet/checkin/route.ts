import { NextResponse } from "next/server";
import { db } from "@/db";
import { vehicleLogs, vehicles } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { fleetCheckinSchema } from "@/lib/validation/schemas";
import { eq, and, desc, isNull, or } from "drizzle-orm";

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

  const parsed = fleetCheckinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid trip check-in parameters", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { vehicleId, action, startOdometer, endOdometer, route } = parsed.data;

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
    // Invariant: check if vehicle or driver already has an unended trip in progress
    const ongoingTrip = await db
      .select({ id: vehicleLogs.id, vehicleId: vehicleLogs.vehicleId, driverId: vehicleLogs.driverId })
      .from(vehicleLogs)
      .where(
        and(
          isNull(vehicleLogs.endOdometer),
          or(
            eq(vehicleLogs.vehicleId, vehicleId),
            eq(vehicleLogs.driverId, session.staffId)
          )
        )
      )
      .get();

    if (ongoingTrip) {
      return NextResponse.json(
        {
          error: "A trip is already in progress for this vehicle or driver. Complete the active trip before starting a new one.",
          activeTripId: ongoingTrip.id,
        },
        { status: 409 }
      );
    }

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

    if (!activeLog) {
      return NextResponse.json(
        { error: "No active trip found to end for this vehicle and driver" },
        { status: 404 }
      );
    }

    // Progression check
    const startOdo = activeLog.startOdometer ?? 0;
    if (endOdometer !== undefined && endOdometer !== null && endOdometer < startOdo) {
      return NextResponse.json(
        { error: "End odometer reading cannot be less than start odometer reading" },
        { status: 400 }
      );
    }

    const finalEndOdo = endOdometer ?? startOdo;
    const distance = Math.max(0, finalEndOdo - startOdo);

    const updatedLog = await db
      .update(vehicleLogs)
      .set({
        endOdometer: finalEndOdo,
        distanceKm: distance,
        notes: `${activeLog.notes || ""}\nTrip ended at ${now}`.trim(),
      })
      .where(eq(vehicleLogs.id, activeLog.id))
      .returning()
      .get();

    await logActivity({
      request,
      action: "update",
      resourceType: "vehicle_log",
      resourceId: activeLog.id,
      staffId: session.staffId,
      details: { action: "end_trip", vehicleId, endOdometer: finalEndOdo, distanceKm: distance },
    });

    return NextResponse.json({ success: true, status: "available", log: updatedLog, serverTime: now });
  }
}, "vehicles:manage");
