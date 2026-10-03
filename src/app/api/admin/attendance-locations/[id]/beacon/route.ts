import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLocations } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { logActivity } from "@/lib/api/activity-log";
import { eq } from "drizzle-orm";

/**
 * BLE BEACON SECURITY CLASSIFICATION:
 * Bluetooth LE beacon signals (UUID/Major/Minor) are unencrypted broadcast signals.
 * In ThaibaHive, beacon proximity is classified as an ADVISORY LOCATION ASSISTANCE SIGNAL
 * for location auto-selection, NOT a standalone single-factor attendance credential.
 * Primary attendance verification requires multi-factor GPS geofencing, shift rules, and device token nonces.
 */
export const POST = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json().catch(() => ({}));
  const { uuid, major, minor, txPower } = body as {
    uuid?: string;
    major?: number;
    minor?: number;
    txPower?: number;
  };

  if (!uuid) {
    return NextResponse.json({ error: "Beacon UUID is required" }, { status: 400 });
  }

  const location = await db.select().from(attendanceLocations).where(eq(attendanceLocations.id, id)).get();
  if (!location) {
    return NextResponse.json({ error: "Attendance location not found" }, { status: 404 });
  }

  const beaconMeta = JSON.stringify({
    uuid,
    major: major ?? 1,
    minor: minor ?? 1,
    txPower: txPower ?? -59,
  });

  const updated = await db
    .update(attendanceLocations)
    .set({
      wifiSsids: beaconMeta, // Stores beacon JSON payload in location metadata column
      updatedAt: new Date().toISOString(),
    })
    .where(eq(attendanceLocations.id, id))
    .returning()
    .get();

  await logActivity({
    staffId: session.staffId,
    action: "ADMIN_BEACON_PAIR",
    resourceType: "location",
    resourceId: id,
    details: {
      uuid,
      major,
      minor,
      locationName: location.name,
    },
  });

  return NextResponse.json({ success: true, location: updated });
}, "org:manage");
