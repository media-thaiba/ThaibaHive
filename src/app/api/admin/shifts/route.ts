import { NextResponse } from "next/server";
import { db } from "@/db";
import { shifts, departments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { adminShiftCreateSchema } from "@/lib/validation/schemas";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export const GET = requireAuth(async (_request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;

  if (instScope) {
    const instDepts = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.institutionId, instScope))
      .all();
    const deptIds = new Set(instDepts.map((d) => d.id));
    const all = await db.select().from(shifts).orderBy(shifts.name).all();
    const filtered = all.filter((s) => !s.departmentId || deptIds.has(s.departmentId));
    return NextResponse.json({ shifts: filtered });
  }

  const all = await db.select().from(shifts).orderBy(shifts.name).all();
  return NextResponse.json({ shifts: all });
}, "attendance:manage");

export const POST = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = adminShiftCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request data" },
      { status: 400 }
    );
  }

  const { name, startTime, endTime, gracePeriodMinutes, departmentId, applicableToAll } = parsed.data;

  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;

  if (departmentId) {
    const dept = await db
      .select({ id: departments.id, institutionId: departments.institutionId })
      .from(departments)
      .where(eq(departments.id, departmentId))
      .get();
    if (!dept) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
    if (instScope && dept.institutionId !== instScope) {
      return NextResponse.json({ error: "Department does not belong to your institution" }, { status: 403 });
    }
  }

  const shift = await db
    .insert(shifts)
    .values({
      id: crypto.randomUUID(),
      name,
      startTime,
      endTime,
      gracePeriodMinutes: gracePeriodMinutes ?? 15,
      departmentId: departmentId || null,
      applicableToAll: applicableToAll ?? !departmentId,
    })
    .returning()
    .get();

  return NextResponse.json({ shift }, { status: 201 });
}, "attendance:manage");
