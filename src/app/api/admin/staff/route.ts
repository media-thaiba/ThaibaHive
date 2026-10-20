import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;

  if (instScope) {
    const all = await db
      .select({
        id: staff.id,
        firstName: staff.firstName,
        lastName: staff.lastName,
        employeeId: staff.employeeId,
        designation: staff.designation,
      })
      .from(staff)
      .innerJoin(staffInstitutions, eq(staffInstitutions.staffId, staff.id))
      .where(and(eq(staff.isActive, true), eq(staffInstitutions.institutionId, instScope)))
      .orderBy(staff.firstName)
      .all();

    return NextResponse.json({ staff: all });
  }

  const all = await db
    .select({
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      employeeId: staff.employeeId,
      designation: staff.designation,
    })
    .from(staff)
    .where(eq(staff.isActive, true))
    .orderBy(staff.firstName)
    .all();

  return NextResponse.json({ staff: all });
}, "attendance:manage");
