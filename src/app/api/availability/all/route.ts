import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  staff,
  staffAvailability,
  staffDepartments,
  staffInstitutions,
} from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { and, eq, inArray, sql } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get("departmentId");
  const scopedInstitutionId = await resolveRequestInstitution(
    session,
    searchParams.get("institutionId")
  );

  const conditions = [eq(staff.isActive, true)];
  if (scopedInstitutionId && scopedInstitutionId !== "global") {
    const instStaff = await db
      .select({ sid: staffInstitutions.staffId })
      .from(staffInstitutions)
      .where(eq(staffInstitutions.institutionId, scopedInstitutionId))
      .all();
    const ids = instStaff.map((s) => s.sid);
    conditions.push(ids.length > 0 ? inArray(staff.id, ids) : sql`false`);
  }

  let results = await db
    .select({
      staffId: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      avatarUrl: staff.avatarUrl,
      designation: staff.designation,
      status: sql<string>`COALESCE(${staffAvailability.status}, 'available')`,
      updatedAt: staffAvailability.updatedAt,
    })
    .from(staff)
    .leftJoin(staffAvailability, eq(staff.id, staffAvailability.staffId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(staff.firstName)
    .all();

  if (departmentId) {
    const deptStaff = await db
      .select({ staffId: staffDepartments.staffId })
      .from(staffDepartments)
      .where(eq(staffDepartments.departmentId, departmentId))
      .all();
    const deptIds = new Set(deptStaff.map((d) => d.staffId));
    results = results.filter((r) => deptIds.has(r.staffId));
  }

  return NextResponse.json({ availability: results });
}, "staff:read");
