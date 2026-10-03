import { NextResponse } from "next/server";
import { db } from "@/db";
import { vehicleLogs } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { vehicleId, action, startOdometer, route } = body;

  if (!vehicleId || !action || !["start_trip", "end_trip"].includes(action)) {
    return NextResponse.json({ error: "Invalid trip check-in parameters" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const serverDate = now.split("T")[0];

  if (action === "start_trip") {
    const log = await db
      .insert(vehicleLogs)
      .values({
        id: crypto.randomUUID(),
        vehicleId,
        driverId: session.staffId || "driver_staff",
        date: serverDate,
        startOdometer: startOdometer || 0,
        route: route || "Campus Route",
        notes: `Trip started at ${now}`,
      })
      .returning()
      .get();

    return NextResponse.json({ success: true, status: "in_use", log, serverTime: now });
  } else {
    return NextResponse.json({ success: true, status: "available", serverTime: now });
  }
}, "vehicles:manage");
