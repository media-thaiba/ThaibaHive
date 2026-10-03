import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, attendanceLocations, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { ensureArray } from "@/lib/utils";
import { eq, isNull, and } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const { allowed, resetMs } = checkRateLimit(session.staffId, {
    windowMs: 60_000,
    max: 60,
    keyPrefix: "nfc-lookup",
  });

  if (!allowed) {
    return rateLimitResponse(resetMs);
  }

  const url = new URL(request.url);
  const tagId = url.searchParams.get("tagId")?.trim();

  if (!tagId) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }

  // Get requester's institution IDs
  const userInsts = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, session.staffId));
  
  const userInstsArray = ensureArray<{ institutionId: string }>(userInsts);
  const userInstitutionIds = new Set(userInstsArray.map((i) => i.institutionId));
  const isSuperAdmin = session.role === "super_admin";

  // Check staff table
  const matchingStaff = await db
    .select({
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      employeeId: staff.employeeId,
      nfcTagId: staff.nfcTagId,
    })
    .from(staff)
    .where(eq(staff.nfcTagId, tagId))
    .get();

  if (matchingStaff) {
    // Check if staff belongs to same institution
    const staffInst = await db
      .select({ institutionId: staffInstitutions.institutionId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.staffId, matchingStaff.id))
      .get();

    const staffInstId = staffInst?.institutionId;
    const isSameTenant = isSuperAdmin || (staffInstId ? userInstitutionIds.has(staffInstId) : false);

    if (isSameTenant) {
      return NextResponse.json({
        isBound: true,
        isSameTenant: true,
        owner: {
          id: matchingStaff.id,
          name: `${matchingStaff.firstName} ${matchingStaff.lastName}`.trim(),
          type: "staff",
          employeeId: matchingStaff.employeeId,
          institutionId: staffInstId || null,
        },
      });
    }

    return NextResponse.json({
      isBound: true,
      isSameTenant: false,
    });
  }

  // Check attendance locations table
  const matchingLocation = await db
    .select({
      id: attendanceLocations.id,
      name: attendanceLocations.name,
      institutionId: attendanceLocations.institutionId,
      nfcTagId: attendanceLocations.nfcTagId,
    })
    .from(attendanceLocations)
    .where(
      and(
        eq(attendanceLocations.nfcTagId, tagId),
        isNull(attendanceLocations.deletedAt)
      )
    )
    .get();

  if (matchingLocation) {
    const locInstId = matchingLocation.institutionId;
    const isSameTenant = isSuperAdmin || (locInstId ? userInstitutionIds.has(locInstId) : true);

    if (isSameTenant) {
      return NextResponse.json({
        isBound: true,
        isSameTenant: true,
        owner: {
          id: matchingLocation.id,
          name: matchingLocation.name,
          type: "location",
          institutionId: locInstId || null,
        },
      });
    }

    return NextResponse.json({
      isBound: true,
      isSameTenant: false,
    });
  }

  return NextResponse.json({
    isBound: false,
  });
}, "org:manage");
