import { NextResponse } from "next/server";
import { db } from "@/db";
import { academicYears, classes, students } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { academicYearUpdateSchema } from "@/lib/validation/schemas";
import { eq, and, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const { searchParams } = new URL(request.url);
  const requestedInst = searchParams.get("institutionId");
  const scopedInstId = await resolveRequestInstitution(session, requestedInst);

  const conditions = [eq(academicYears.id, id)];
  if (scopedInstId !== "global") {
    conditions.push(eq(academicYears.institutionId, scopedInstId));
  }

  const row = await db
    .select()
    .from(academicYears)
    .where(and(...conditions))
    .get();

  if (!row) {
    return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
  }

  return NextResponse.json({ academicYear: row });
}, "academic_years:manage");

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parseResult = academicYearUpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message || "Validation failed" },
      { status: 400 }
    );
  }

  const updates = parseResult.data;
  const { searchParams } = new URL(request.url);
  const requestedInst = searchParams.get("institutionId");
  const scopedInstId = await resolveRequestInstitution(session, requestedInst);

  // Fetch target academic year
  const conditions = [eq(academicYears.id, id)];
  if (scopedInstId !== "global") {
    conditions.push(eq(academicYears.institutionId, scopedInstId));
  }

  const current = await db
    .select()
    .from(academicYears)
    .where(and(...conditions))
    .get();

  if (!current) {
    return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
  }

  const institutionId = current.institutionId;

  // Check duplicate name collision against sibling sessions
  if (updates.name && updates.name !== current.name && institutionId) {
    const duplicate = await db
      .select({ id: academicYears.id })
      .from(academicYears)
      .where(
        and(
          eq(academicYears.institutionId, institutionId),
          eq(academicYears.name, updates.name),
          ne(academicYears.id, id)
        )
      )
      .get();

    if (duplicate) {
      return NextResponse.json(
        { error: "Another academic year with this name already exists in this institution" },
        { status: 409 }
      );
    }
  }

  // Check date overlap against sibling sessions if dates are updated
  const effectiveStart = updates.startDate ?? current.startDate;
  const effectiveEnd = updates.endDate ?? current.endDate;

  if (effectiveStart >= effectiveEnd) {
    return NextResponse.json(
      { error: "endDate must be on or after startDate (strictly after startDate)" },
      { status: 400 }
    );
  }

  if ((updates.startDate || updates.endDate) && institutionId) {
    const siblingYears = await db
      .select({
        id: academicYears.id,
        name: academicYears.name,
        startDate: academicYears.startDate,
        endDate: academicYears.endDate,
      })
      .from(academicYears)
      .where(
        and(
          eq(academicYears.institutionId, institutionId),
          ne(academicYears.id, id)
        )
      )
      .all();

    const overlapping = siblingYears.find(
      (sy) => effectiveStart <= sy.endDate && effectiveEnd >= sy.startDate
    );

    if (overlapping) {
      return NextResponse.json(
        {
          error: `Updated dates overlap with existing session '${overlapping.name}' (${overlapping.startDate} to ${overlapping.endDate})`,
        },
        { status: 409 }
      );
    }
  }

  const updated = await db
    .update(academicYears)
    .set({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.startDate !== undefined && { startDate: updates.startDate }),
      ...(updates.endDate !== undefined && { endDate: updates.endDate }),
      ...(updates.isActive !== undefined && { isActive: updates.isActive }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(academicYears.id, id))
    .returning()
    .get();

  return NextResponse.json({ academicYear: updated });
}, "academic_years:manage");

export const DELETE = requireAuth(async (request: Request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { id } = await context!.params;
  const { searchParams } = new URL(request.url);
  const requestedInst = searchParams.get("institutionId");
  const scopedInstId = await resolveRequestInstitution(session, requestedInst);

  const conditions = [eq(academicYears.id, id)];
  if (scopedInstId !== "global") {
    conditions.push(eq(academicYears.institutionId, scopedInstId));
  }

  const existing = await db
    .select()
    .from(academicYears)
    .where(and(...conditions))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
  }

  // Referential integrity checks: active classes or enrolled students
  const linkedClass = await db
    .select({ id: classes.id })
    .from(classes)
    .where(eq(classes.academicYearId, id))
    .get();

  if (linkedClass) {
    return NextResponse.json(
      {
        error: "Cannot delete academic year: active classes are assigned to this session. Archive it by setting isActive=false instead.",
      },
      { status: 409 }
    );
  }

  const linkedStudent = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.academicYearId, id))
    .get();

  if (linkedStudent) {
    return NextResponse.json(
      {
        error: "Cannot delete academic year: enrolled students are assigned to this session. Archive it by setting isActive=false instead.",
      },
      { status: 409 }
    );
  }

  await db.delete(academicYears).where(eq(academicYears.id, id));

  return NextResponse.json({ success: true, message: "Academic year deleted successfully" });
}, "academic_years:manage");
