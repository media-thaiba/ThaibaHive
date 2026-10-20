import { NextResponse } from "next/server";
import { db } from "@/db";
import { grievances, staff, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { grievanceCreateSchema } from "@/lib/validation/schemas";
import { eq, and, desc, inArray, or, isNull } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const role = session.role;
  const conditions = [];

  if (status) conditions.push(eq(grievances.status, status));

  // Role-based visibility and institutional scoping
  const isSuperAdmin = role === "super_admin";
  const isManager = ["admin", "principal", "hod"].includes(role);

  if (!isSuperAdmin && !isManager) {
    // Non-managers can only see their own submitted grievances
    conditions.push(and(eq(grievances.staffId, session.staffId), eq(grievances.isAnonymous, false)));
  } else if (!isSuperAdmin && isManager) {
    // Institutional managers: scope to their institution's staff plus unlinked anonymous entries
    const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId);
    if (scopedInstitutionId && scopedInstitutionId !== "global") {
      const instStaff = await db
        .select({ staffId: staffInstitutions.staffId })
        .from(staffInstitutions)
        .where(eq(staffInstitutions.institutionId, scopedInstitutionId))
        .all();

      const instStaffIds = instStaff.map((s) => s.staffId);
      if (instStaffIds.length > 0) {
        conditions.push(or(inArray(grievances.staffId, instStaffIds), isNull(grievances.staffId)));
      } else {
        conditions.push(isNull(grievances.staffId));
      }
    }
  }

  const rows = await db
    .select({
      id: grievances.id,
      staffId: grievances.staffId,
      isAnonymous: grievances.isAnonymous,
      category: grievances.category,
      subject: grievances.subject,
      description: grievances.description,
      status: grievances.status,
      response: grievances.response,
      respondedById: grievances.respondedById,
      responderName: staff.firstName,
      responderLastName: staff.lastName,
      respondedAt: grievances.respondedAt,
      createdAt: grievances.createdAt,
      updatedAt: grievances.updatedAt,
    })
    .from(grievances)
    .leftJoin(staff, eq(grievances.respondedById, staff.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(grievances.createdAt))
    .all();

  // Non-anonymous submitters lookup
  const submitterIds = [
    ...new Set(
      rows
        .filter((r) => !r.isAnonymous && r.staffId !== null)
        .map((r) => r.staffId!)
    ),
  ];

  const submitters =
    submitterIds.length > 0
      ? await db
          .select({ id: staff.id, firstName: staff.firstName, lastName: staff.lastName })
          .from(staff)
          .where(inArray(staff.id, submitterIds))
          .all()
      : [];
  const submitterMap = new Map(submitters.map((s) => [s.id, `${s.firstName} ${s.lastName}`]));

  // Strictly sanitize anonymous rows: staffId is masked to null
  const result = rows.map((r) => ({
    ...r,
    staffId: r.isAnonymous ? null : r.staffId,
    submitterName: r.isAnonymous ? null : (r.staffId ? submitterMap.get(r.staffId) ?? null : null),
  }));

  return NextResponse.json({ grievances: result });
}, "grievances:read");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(`grievance-create:${session.staffId}`, { windowMs: 60_000, max: 10 });
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = grievanceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { isAnonymous, category, subject, description } = parsed.data;
  const anonymous = isAnonymous !== undefined ? isAnonymous : true;

  const grievance = await db
    .insert(grievances)
    .values({
      id: crypto.randomUUID(),
      staffId: anonymous ? null : session.staffId,
      isAnonymous: anonymous,
      category: category || "general",
      subject,
      description,
      status: "open",
    })
    .returning()
    .get();

  // Sanitize return object
  const sanitized = {
    ...grievance,
    staffId: anonymous ? null : grievance.staffId,
  };

  return NextResponse.json({ grievance: sanitized }, { status: 201 });
}, "grievances:create");
