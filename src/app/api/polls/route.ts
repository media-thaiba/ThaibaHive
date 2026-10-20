import { NextResponse } from "next/server";
import { db } from "@/db";
import { polls, staff, staffDepartments, staffInstitutions } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logActivity } from "@/lib/api/activity-log";
import { pollCreateSchema } from "@/lib/validation/schemas";
import { parsePollOptions, resolvePollScope } from "@/lib/polls/ledger";
import { eq, desc, and, or, isNull, inArray } from "drizzle-orm";
import { createNotificationsForTarget } from "@/lib/api/notifications";
import type { StaffRole } from "@/types";

export const GET = requireAuth(async (request, session) => {
  const { searchParams } = new URL(request.url);
  const requestedInst = searchParams.get("institutionId");
  const scopedInstId = await resolveRequestInstitution(session, requestedInst);

  // Super Admin: Global multi-institution visibility with optional filtering
  if (session.role === "super_admin") {
    const targetFilter = requestedInst
      ? or(eq(polls.targetInstitutionId, requestedInst), isNull(polls.targetInstitutionId))
      : undefined;

    const all = await db
      .select({
        id: polls.id,
        title: polls.title,
        description: polls.description,
        question: polls.question,
        options: polls.options,
        isActive: polls.isActive,
        expiresAt: polls.expiresAt,
        createdAt: polls.createdAt,
        updatedAt: polls.updatedAt,
        targetRole: polls.targetRole,
        targetDepartmentId: polls.targetDepartmentId,
        targetInstitutionId: polls.targetInstitutionId,
        createdByName: staff.firstName,
        createdByLastName: staff.lastName,
      })
      .from(polls)
      .leftJoin(staff, eq(polls.createdById, staff.id))
      .where(targetFilter)
      .orderBy(desc(polls.createdAt))
      .all();

    const mapped = all.map((p) => ({
      ...p,
      options: parsePollOptions(p.options),
    }));

    return NextResponse.json({ polls: mapped });
  }

  // Institutional Administrators (Admin / Principal): Scoped strictly to their active campus
  if (session.role === "admin" || session.role === "principal") {
    const instCondition = scopedInstId && scopedInstId !== "global"
      ? or(eq(polls.targetInstitutionId, scopedInstId), isNull(polls.targetInstitutionId))
      : undefined;

    const adminPolls = await db
      .select({
        id: polls.id,
        title: polls.title,
        description: polls.description,
        question: polls.question,
        options: polls.options,
        isActive: polls.isActive,
        expiresAt: polls.expiresAt,
        createdAt: polls.createdAt,
        updatedAt: polls.updatedAt,
        targetRole: polls.targetRole,
        targetDepartmentId: polls.targetDepartmentId,
        targetInstitutionId: polls.targetInstitutionId,
        createdByName: staff.firstName,
        createdByLastName: staff.lastName,
      })
      .from(polls)
      .leftJoin(staff, eq(polls.createdById, staff.id))
      .where(instCondition)
      .orderBy(desc(polls.createdAt))
      .all();

    const mapped = adminPolls.map((p) => ({
      ...p,
      options: parsePollOptions(p.options),
    }));

    return NextResponse.json({ polls: mapped });
  }

  // Standard Staff: strict audience targeting filters
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
  if (scopedInstId && scopedInstId !== "global" && !instIds.includes(scopedInstId)) {
    instIds.push(scopedInstId);
  }

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
      title: polls.title,
      description: polls.description,
      question: polls.question,
      options: polls.options,
      isActive: polls.isActive,
      expiresAt: polls.expiresAt,
      createdAt: polls.createdAt,
      updatedAt: polls.updatedAt,
      targetRole: polls.targetRole,
      targetDepartmentId: polls.targetDepartmentId,
      targetInstitutionId: polls.targetInstitutionId,
      createdByName: staff.firstName,
      createdByLastName: staff.lastName,
    })
    .from(polls)
    .leftJoin(staff, eq(polls.createdById, staff.id))
    .where(and(eq(polls.isActive, true), targetingClause))
    .orderBy(desc(polls.createdAt))
    .all();

  const mapped = staffPolls.map((p) => ({
    ...p,
    options: parsePollOptions(p.options),
  }));

  return NextResponse.json({ polls: mapped });
}, "polls:read");

export const POST = requireAuth(async (request: Request, session) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimit = checkRateLimit(`polls:create:${session.staffId || ip}`, "write");
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = pollCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { title, description, question, options, targetRole, targetDepartmentId, targetInstitutionId, expiresAt } =
    parsed.data;

  const scopedInstId = await resolvePollScope(session);

  // Cross-tenant target authorization check
  let finalTargetInstitutionId = targetInstitutionId || null;
  if (session.role !== "super_admin") {
    if (finalTargetInstitutionId && scopedInstId !== "global" && finalTargetInstitutionId !== scopedInstId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot create polls for another institution" },
        { status: 403 }
      );
    }
    if (!finalTargetInstitutionId && scopedInstId !== "global") {
      finalTargetInstitutionId = scopedInstId;
    }
  }

  const poll = await db
    .insert(polls)
    .values({
      id: crypto.randomUUID(),
      title: title || question,
      description: description || null,
      question,
      options,
      targetRole: targetRole || null,
      targetDepartmentId: targetDepartmentId || null,
      targetInstitutionId: finalTargetInstitutionId,
      createdById: session.staffId,
      expiresAt: expiresAt || null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning()
    .get();

  await logActivity({
    request,
    staffId: session.staffId,
    action: "POLL_CREATE",
    resourceType: "poll",
    resourceId: poll.id,
    details: {
      title: poll.title,
      question: poll.question,
      optionsCount: options.length,
      targetInstitutionId: finalTargetInstitutionId,
    },
  });

  // Send auto-notifications to targeted audience
  await createNotificationsForTarget({
    title: `New Poll: ${question}`,
    message: `Please share your opinion. ${expiresAt ? `Expires on ${expiresAt.split("T")[0]}` : ""}`,
    type: "poll",
    referenceType: "poll",
    referenceId: poll.id,
    targetRole: (targetRole as StaffRole) || undefined,
    targetDepartmentId: targetDepartmentId || undefined,
    targetInstitutionId: finalTargetInstitutionId || undefined,
  });

  return NextResponse.json(
    {
      poll: {
        ...poll,
        options: parsePollOptions(poll.options),
      },
    },
    { status: 201 }
  );
}, "polls:create");
