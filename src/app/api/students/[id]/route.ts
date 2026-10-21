import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@thaiba/auth";
import { db } from "@/db";
import { students } from "@thaiba/db/schema";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";
import { studentUpdateSchema } from "@/lib/validation/schemas";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "read");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-1) ?? "";
  const scope = await resolveScopedInstitutionId(url.searchParams.get("institutionId"));

  const whereClause = scope && scope !== "global"
    ? and(eq(students.id, id), eq(students.institutionId, scope))
    : eq(students.id, id);

  const [student] = await db.select().from(students).where(whereClause).all();
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  return NextResponse.json(student);
}, "students:read");

export const PATCH = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-1) ?? "";

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = studentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const scope = await resolveScopedInstitutionId((body as any)?.institutionId || url.searchParams.get("institutionId"));

  const whereClause = scope && scope !== "global"
    ? and(eq(students.id, id), eq(students.institutionId, scope))
    : eq(students.id, id);

  const [existing] = await db.select({ id: students.id }).from(students).where(whereClause).all();
  if (!existing) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const { institutionId: _instId, ...updateData } = parsed.data;
  await db.update(students).set({ ...updateData, updatedAt: new Date().toISOString() }).where(whereClause).run();
  const [updated] = await db.select().from(students).where(whereClause).all();
  return NextResponse.json(updated);
}, "students:write");

export const DELETE = requireAuth(async (request: Request, session) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-1) ?? "";
  const scope = await resolveScopedInstitutionId(url.searchParams.get("institutionId"));

  const whereClause = scope && scope !== "global"
    ? and(eq(students.id, id), eq(students.institutionId, scope))
    : eq(students.id, id);

  const [existing] = await db.select({ id: students.id }).from(students).where(whereClause).all();
  if (!existing) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  await db.delete(students).where(whereClause).run();
  return NextResponse.json({ success: true });
}, "students:delete");
