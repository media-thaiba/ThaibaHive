import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLocations, institutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, isNull } from "drizzle-orm";
import { logActivity } from "@/lib/api/activity-log";

export const GET = requireAuth(async (request: Request) => {
  const url = new URL(request.url);
  const showDeleted = url.searchParams.get("showDeleted") === "true";

  const conditions = showDeleted
    ? undefined
    : isNull(attendanceLocations.deletedAt);

  const all = await db
    .select({
      id: attendanceLocations.id,
      name: attendanceLocations.name,
      institutionId: attendanceLocations.institutionId,
      institutionName: institutions.name,
      nfcTagId: attendanceLocations.nfcTagId,
      qrSecret: attendanceLocations.qrSecret,
      isActive: attendanceLocations.isActive,
      latitude: attendanceLocations.latitude,
      longitude: attendanceLocations.longitude,
      radius: attendanceLocations.radius,
      accuracy: attendanceLocations.accuracy,
      wifiSsids: attendanceLocations.wifiSsids,
      deletedAt: attendanceLocations.deletedAt,
      createdAt: attendanceLocations.createdAt,
      updatedAt: attendanceLocations.updatedAt,
    })
    .from(attendanceLocations)
    .leftJoin(institutions, eq(attendanceLocations.institutionId, institutions.id))
    .where(conditions)
    .orderBy(attendanceLocations.name);
  return NextResponse.json({ locations: all });
}, "attendance:manage");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { name, institutionId, nfcTagId, qrSecret, latitude, longitude, radius, accuracy, wifiSsids } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (latitude !== undefined && latitude !== null && latitude !== "") {
    const lat = Number(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return NextResponse.json({ error: "Latitude must be a number between -90 and 90" }, { status: 400 });
    }
  }
  if (longitude !== undefined && longitude !== null && longitude !== "") {
    const lon = Number(longitude);
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return NextResponse.json({ error: "Longitude must be a number between -180 and 180" }, { status: 400 });
    }
  }
  if (radius !== undefined && radius !== null && radius !== "") {
    const rad = Number(radius);
    if (isNaN(rad) || rad <= 0) {
      return NextResponse.json({ error: "Radius must be a positive number" }, { status: 400 });
    }
  }
  if (accuracy !== undefined && accuracy !== null && accuracy !== "") {
    const acc = Number(accuracy);
    if (isNaN(acc) || acc <= 0) {
      return NextResponse.json({ error: "Accuracy must be a positive number" }, { status: 400 });
    }
  }

  const id = crypto.randomUUID();
  const secret = qrSecret || crypto.randomUUID();

  const location = await db
    .insert(attendanceLocations)
    .values({
      id,
      name,
      institutionId: institutionId || null,
      nfcTagId: nfcTagId || null,
      qrSecret: secret,
      latitude: latitude !== undefined && latitude !== null && latitude !== "" ? Number(latitude) : null,
      longitude: longitude !== undefined && longitude !== null && longitude !== "" ? Number(longitude) : null,
      radius: radius !== undefined && radius !== null && radius !== "" ? Number(radius) : null,
      accuracy: accuracy !== undefined && accuracy !== null && accuracy !== "" ? Number(accuracy) : null,
      wifiSsids: wifiSsids || null,
    })
    .returning()
    .get();

  await logActivity({
    request,
    staffId: session.staffId,
    action: "CREATE_LOCATION",
    resourceType: "attendance_location",
    resourceId: id,
    details: { name, nfcTagId: nfcTagId || null, wifiSsids: wifiSsids || null, accuracy: accuracy || null },
  });

  return NextResponse.json({ location }, { status: 201 });
}, "attendance:manage");
