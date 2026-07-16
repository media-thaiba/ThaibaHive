import { NextResponse } from "next/server";
import { db } from "@/db";
import { polls, staff, staffDepartments, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pollCreateSchema } from "@/lib/validation/schemas";
import { eq, desc, and, or, isNull, inArray, sql } from "drizzle-orm";
import { createNotificationsForTarget } from "@/lib/api/notifications";
import type { StaffRole } from "@/types";

const ADMIN_ROLES: StaffRole[] = ["super_admin", "admin", "principal"];

export const GET = requireAuth(async (request, session) => {
  const isAdmin = ADMIN_ROLES.includes(session.role as StaffRole);

  if (isAdmin) {
    const all = await db
      .select({
        id: polls.id,
        question: polls.question,
        options: polls.options,
        isActive: polls.isActive,
        expiresAt: polls.expiresAt,
        createdAt: polls.createdAt,
        targetRole: polls.targetRole,
        targetDepartmentId: polls.targetDepartmentId,
        targetInstitutionId: polls.targetInstitutionId,
        createdByName: staff.firstName,
        createdByLastName: staff.lastName,
      })
      .from(polls)
      .leftJoin(staff, eq(polls.createdById, staff.id))
      .orderBy(desc(polls.createdAt))
      .all();
    return NextResponse.json({ polls: all });
  }

  // Standard Staff: target audience filtering
  const userDepts = await db
    .select({ departmentId: staffDepartments.departmentId })
    .from(staffDepartments)
    .where(eq(staffDepartments.staffId, session.staffId))
    .all();
  const deptIds = userDepts.map((d) => d.departmentId).filter(Boolean);

  const userInsts = await db
    .select({ institutionId: staffInstitutions.institutionId })
    .from(staffInstitutions)
    .where(eq(staffInstitutions.staffId, session.staffId))
    .all();
  const instIds = userInsts.map((i) => i.institutionId).filter(Boolean);

  const roleMatch = or(isNull(polls.targetRole), eq(polls.targetRole, session.role));

  const deptMatch = deptIds.length > 0
    ? or(isNull(polls.targetDepartmentId), inArray(polls.targetDepartmentId, deptIds))
    : isNull(polls.targetDepartmentId);

  const instMatch = instIds.length > 0
    ? or(isNull(polls.targetInstitutionId), inArray(polls.targetInstitutionId, instIds))
    : isNull(polls.targetInstitutionId);

  const targetingClause = and(roleMatch, deptMatch, instMatch);

  const staffPolls = await db
    .select({
      id: polls.id,
      question: polls.question,
      options: polls.options,
      isActive: polls.isActive,
      expiresAt: polls.expiresAt,
      createdAt: polls.createdAt,
      createdByName: staff.firstName,
      createdByLastName: staff.lastName,
    })
    .from(polls)
    .leftJoin(staff, eq(polls.createdById, staff.id))
    .where(and(eq(polls.isActive, true), targetingClause))
    .orderBy(desc(polls.createdAt))
    .all();

  return NextResponse.json({ polls: staffPolls });
}, "polls:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const parsed = pollCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { title, description, question, options, targetRole, targetDepartmentId, targetInstitutionId, expiresAt } = parsed.data;

  const poll = await db
    .insert(polls)
    .values({
      id: crypto.randomUUID(),
      title: title || question,
      description,
      question,
      options,
      targetRole,
      targetDepartmentId,
      targetInstitutionId,
      createdById: session.staffId,
      expiresAt,
    })
    .returning()
    .get();

  // Send auto-notifications
  await createNotificationsForTarget({
    title: `New Poll: ${question}`,
    message: `Please share your opinion. ${expiresAt ? `Expires on ${expiresAt.split("T")[0]}` : ""}`,
    type: "poll",
    referenceType: "poll",
    referenceId: poll.id,
    targetRole: targetRole as StaffRole | undefined,
    targetDepartmentId,
    targetInstitutionId,
  });

  return NextResponse.json({ poll }, { status: 201 });
}, "polls:create");