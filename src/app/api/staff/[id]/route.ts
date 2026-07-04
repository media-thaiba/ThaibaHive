import { NextResponse } from "next/server";
import { db } from "@/db";
import { staff, staffDepartments, staffInstitutions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  const member = await db.select().from(staff).where(eq(staff.id, id)).get();
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const departments = await db.select().from(staffDepartments).where(eq(staffDepartments.staffId, id)).all();
  const institutions = await db.select().from(staffInstitutions).where(eq(staffInstitutions.staffId, id)).all();

  return NextResponse.json({ staff: member, departments, institutions });
}, "staff:read");

export const PUT = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const { departmentIds, institutionIds, ...fields } = body;

  const updated = await db
    .update(staff)
    .set({ ...fields, updatedAt: new Date().toISOString() })
    .where(eq(staff.id, id))
    .returning()
    .get();

  if (departmentIds) {
    await db.delete(staffDepartments).where(eq(staffDepartments.staffId, id)).run();
    if (departmentIds.length) {
      await db.insert(staffDepartments).values(
        departmentIds.map((deptId: string) => ({
          id: crypto.randomUUID(),
          staffId: id,
          departmentId: deptId,
        }))
      ).run();
    }
  }

  if (institutionIds) {
    await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, id)).run();
    if (institutionIds.length) {
      await db.insert(staffInstitutions).values(
        institutionIds.map((instId: string) => ({
          id: crypto.randomUUID(),
          staffId: id,
          institutionId: instId,
        }))
      ).run();
    }
  }

  return NextResponse.json({ staff: updated });
}, "staff:update");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  await db.delete(staffDepartments).where(eq(staffDepartments.staffId, id)).run();
  await db.delete(staffInstitutions).where(eq(staffInstitutions.staffId, id)).run();
  await db.delete(staff).where(eq(staff.id, id)).run();
  return NextResponse.json({ success: true });
}, "staff:delete");
