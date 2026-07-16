import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLocations, institutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async () => {
  const all = await db
    .select({
      id: attendanceLocations.id,
      name: attendanceLocations.name,
      institutionId: attendanceLocations.institutionId,
      institutionName: institutions.name,
      nfcTagId: attendanceLocations.nfcTagId,
      isActive: attendanceLocations.isActive,
      latitude: attendanceLocations.latitude,
      longitude: attendanceLocations.longitude,
      radius: attendanceLocations.radius,
      createdAt: attendanceLocations.createdAt,
      updatedAt: attendanceLocations.updatedAt,
    })
    .from(attendanceLocations)
    .leftJoin(institutions, eq(attendanceLocations.institutionId, institutions.id))
    .orderBy(attendanceLocations.name);
  return NextResponse.json({ locations: all });
}, "attendance:manage");

export const POST = requireAuth(async (request: Request) => {
  const body = await request.json();
  const { name, institutionId, nfcTagId, qrSecret, latitude, longitude, radius } = body;

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
    })
    .returning()
    .get();

  return NextResponse.json({ location }, { status: 201 });
}, "attendance:manage");
