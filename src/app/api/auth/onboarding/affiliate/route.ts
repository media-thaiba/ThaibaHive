import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { db } from "@/db";
import { staff, staffInstitutions, staffDepartments, institutions, departments } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request, session) => {
  const now = new Date().toISOString();
  const body = await request.json();
  const { institutionId, departmentId, designation } = body;

  if (!institutionId) {
    return NextResponse.json({ error: "institutionId is required" }, { status: 400 });
  }

  // Verify the institution exists and is active
  const institution = await db
    .select()
    .from(institutions)
    .where(eq(institutions.id, institutionId))
    .get();

  if (!institution) {
    return NextResponse.json({ error: "Invalid institution" }, { status: 400 });
  }
  if (!(institution.isActive ?? true)) {
    return NextResponse.json({ error: "Institution is not active" }, { status: 400 });
  }

  // Verify department belongs to the selected institution (if provided)
  if (departmentId) {
    const department = await db
      .select()
      .from(departments)
      .where(and(eq(departments.id, departmentId), eq(departments.institutionId, institutionId)))
      .get();

    if (!department) {
      return NextResponse.json({ error: "Department does not belong to the selected institution" }, { status: 400 });
    }
  }

  // Bind staff to institution
  await db
    .insert(staffInstitutions)
    .values({
      id: `si_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      staffId: session.staffId,
      institutionId,
    });

  // Bind staff to department (if provided)
  if (departmentId) {
    await db
      .insert(staffDepartments)
      .values({
        id: `sd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        staffId: session.staffId,
        departmentId,
        isPrimary: true,
      });
  }

  // Optionally update designation
  if (designation) {
    await db.update(staff).set({ designation }).where(eq(staff.id, session.staffId));
  }

  // Mark onboarding complete
  await db
    .update(staff)
    .set({
      isFirstLogin: false,
      onboardingCompletedAt: now,
    })
    .where(eq(staff.id, session.staffId));

  return NextResponse.json({
    success: true,
    needsOnboarding: false,
    message: "Onboarding complete",
  });
}, "profile:read");
