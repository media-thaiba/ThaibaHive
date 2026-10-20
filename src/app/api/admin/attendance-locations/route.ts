import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendanceLocations, institutions } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { eq, isNull, and } from "drizzle-orm";
import { logActivity } from "@/lib/api/activity-log";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { attendanceLocationCreateSchema } from "@/lib/validation/schemas";
import { getEffectiveInstitutionId } from "@/lib/attendance/locations/utils";

export const GET = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const requestedInst = url.searchParams.get("institutionId");
  const effectiveInst = await getEffectiveInstitutionId(session);
  const scopedInstId = effectiveInst !== "global" && effectiveInst !== null
    ? effectiveInst
    : await resolveRequestInstitution(session, requestedInst);
  const showDeleted = url.searchParams.get("showDeleted") === "true";

  const conditions = [];
  if (!showDeleted) {
    conditions.push(isNull(attendanceLocations.deletedAt));
  }
  if (scopedInstId !== "global") {
    conditions.push(eq(attendanceLocations.institutionId, scopedInstId));
  }

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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(attendanceLocations.name);

  return NextResponse.json({ locations: all });
}, "attendance:manage");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = attendanceLocationCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const {
    name,
    institutionId: reqInst,
    nfcTagId,
    qrSecret,
    latitude,
    longitude,
    radius,
    accuracy,
    wifiSsids,
    isActive,
  } = parsed.data;

  const scopedInstId = await getEffectiveInstitutionId(session);
  if (scopedInstId && scopedInstId !== "global" && reqInst && reqInst !== scopedInstId) {
    return NextResponse.json({ error: "Cannot create locations for another institution" }, { status: 403 });
  }

  const institutionId = scopedInstId && scopedInstId !== "global"
    ? scopedInstId
    : await resolveRequestInstitution(session, reqInst);

  if (!institutionId || institutionId === "global") {
    return NextResponse.json({ error: "Explicit institutionId required" }, { status: 400 });
  }

  // NFC Tag collision check: ensure active location doesn't already hold this tag
  if (nfcTagId) {
    const conflict = await db
      .select({ id: attendanceLocations.id })
      .from(attendanceLocations)
      .where(
        and(
          eq(attendanceLocations.nfcTagId, nfcTagId),
          isNull(attendanceLocations.deletedAt)
        )
      )
      .get();

    if (conflict) {
      return NextResponse.json(
        { error: "An active location with this NFC tag already exists." },
        { status: 409 }
      );
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
      isActive: isActive !== undefined ? isActive : true,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      radius: radius ?? (latitude != null ? 100 : null),
      accuracy: accuracy ?? null,
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
