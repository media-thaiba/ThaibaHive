import { NextResponse } from "next/server";
import { db } from "@/db";
import { academicYears } from "@/db/schema";
import { requireAuth, resolveRequestInstitution } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { academicYearCreateSchema } from "@/lib/validation/schemas";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const GET = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const { searchParams } = new URL(request.url);
  const requestedInst = searchParams.get("institutionId");
  const scopedInstId = await resolveRequestInstitution(session, requestedInst);

  const conditions = [];
  if (scopedInstId !== "global") {
    conditions.push(eq(academicYears.institutionId, scopedInstId));
  }

  const isActiveParam = searchParams.get("isActive");
  if (isActiveParam !== null) {
    conditions.push(eq(academicYears.isActive, isActiveParam === "true"));
  }

  let query = db.select().from(academicYears).$dynamic();
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const rows = await query.orderBy(academicYears.startDate).all();

  return NextResponse.json({ academicYears: rows });
}, "academic_years:manage");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parseResult = academicYearCreateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message || "Validation failed" },
      { status: 400 }
    );
  }

  const validData = parseResult.data;

  const institutionId = await resolveRequestInstitution(session, validData.institutionId);
  if (institutionId === "global") {
    return NextResponse.json({ error: "Explicit institutionId required" }, { status: 400 });
  }

  // Duplicate collision check within same institution
  const existingName = await db
    .select({ id: academicYears.id })
    .from(academicYears)
    .where(
      and(
        eq(academicYears.institutionId, institutionId),
        eq(academicYears.name, validData.name)
      )
    )
    .get();

  if (existingName) {
    return NextResponse.json(
      { error: "An academic year with this name already exists in this institution" },
      { status: 409 }
    );
  }

  // Date overlap collision check within same institution
  const existingYears = await db
    .select({
      id: academicYears.id,
      name: academicYears.name,
      startDate: academicYears.startDate,
      endDate: academicYears.endDate,
    })
    .from(academicYears)
    .where(eq(academicYears.institutionId, institutionId))
    .all();

  const overlapping = existingYears.find(
    (ey) => validData.startDate <= ey.endDate && validData.endDate >= ey.startDate
  );

  if (overlapping) {
    return NextResponse.json(
      {
        error: `Academic year dates overlap with existing session '${overlapping.name}' (${overlapping.startDate} to ${overlapping.endDate})`,
      },
      { status: 409 }
    );
  }

  const result = await db
    .insert(academicYears)
    .values({
      id: crypto.randomUUID(),
      name: validData.name,
      startDate: validData.startDate,
      endDate: validData.endDate,
      isActive: validData.isActive ?? true,
      institutionId,
    })
    .returning()
    .get();

  return NextResponse.json({ academicYear: result }, { status: 201 });
}, "academic_years:manage");
