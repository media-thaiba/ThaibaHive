import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, attendanceLocations, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { logActivity } from "@/lib/api/activity-log";
import { ensureArray } from "@/lib/utils";
import { eq, isNull, and } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { type, targetId } = body;

  if (!type || !["staff", "location"].includes(type)) {
    return NextResponse.json({ error: "type must be 'staff' or 'location'" }, { status: 400 });
  }

  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }

  const isSuperAdmin = session.role === "super_admin";
  const userInsts = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, session.staffId));
  const userInstsArray = ensureArray<{ institutionId: string }>(userInsts);
  const userInstitutionIds = new Set(userInstsArray.map((i) => i.institutionId));

  let previousTagId: string | null = null;
  let targetName = "";

  if (type === "staff") {
    const targetStaff = await db
      .select({ id: staff.id, firstName: staff.firstName, lastName: staff.lastName, nfcTagId: staff.nfcTagId })
      .from(staff)
      .where(eq(staff.id, targetId))
      .get();

    if (!targetStaff) {
      return NextResponse.json({ error: "Target staff member not found" }, { status: 404 });
    }

    targetName = `${targetStaff.firstName} ${targetStaff.lastName}`.trim();
    previousTagId = targetStaff.nfcTagId;

    const sInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, targetId))
      .get();

    const targetInstId = sInst?.institutionId;
    if (!isSuperAdmin && targetInstId && !userInstitutionIds.has(targetInstId)) {
      return NextResponse.json({ error: "Forbidden: target belongs to another organization" }, { status: 403 });
    }

    await db.transaction(async (tx) => {
      await tx.update(staff).set({ nfcTagId: null }).where(eq(staff.id, targetId));
    });
  } else {
    const targetLoc = await db
      .select({ id: attendanceLocations.id, name: attendanceLocations.name, institutionId: attendanceLocations.institutionId, nfcTagId: attendanceLocations.nfcTagId })
      .from(attendanceLocations)
      .where(and(eq(attendanceLocations.id, targetId), isNull(attendanceLocations.deletedAt)))
      .get();

    if (!targetLoc) {
      return NextResponse.json({ error: "Target location not found" }, { status: 404 });
    }

    targetName = targetLoc.name;
    previousTagId = targetLoc.nfcTagId;

    if (!isSuperAdmin && targetLoc.institutionId && !userInstitutionIds.has(targetLoc.institutionId)) {
      return NextResponse.json({ error: "Forbidden: target belongs to another organization" }, { status: 403 });
    }

    await db.transaction(async (tx) => {
      await tx.update(attendanceLocations).set({ nfcTagId: null }).where(eq(attendanceLocations.id, targetId));
    });
  }

  await logActivity({
    request,
    staffId: session.staffId,
    action: "ADMIN_NFC_UNBIND",
    resourceType: type === "staff" ? "staff" : "attendance_location",
    resourceId: targetId,
    details: { unboundTagId: previousTagId },
  });

  return NextResponse.json({
    success: true,
    unbound: {
      type,
      targetId,
      targetName,
      unboundTagId: previousTagId,
    },
  });
}, "org:manage");
