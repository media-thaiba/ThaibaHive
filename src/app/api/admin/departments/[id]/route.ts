import { NextResponse } from "next/server";
import { db } from "@/db";
import { departments, subDepartments, staffDepartments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pick } from "@/lib/api/pick";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  const dept = await db.select().from(departments).where(eq(departments.id, id)).get();
  if (!dept) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ department: dept });
}, "org:manage");

export const PUT = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const updated = await db
    .update(departments)
    .set({
      ...pick(body, ["name", "code", "description", "headUserId"]),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(departments.id, id))
    .returning()
    .get();

  return NextResponse.json({ department: updated });
}, "org:manage");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const subCount = await db.select().from(subDepartments).where(eq(subDepartments.departmentId, id)).all();
  if (subCount.length > 0) {
    return NextResponse.json({ error: "Remove all sub-departments first" }, { status: 400 });
  }

  await db.delete(staffDepartments).where(eq(staffDepartments.departmentId, id)).run();
  await db.delete(departments).where(eq(departments.id, id)).run();
  return NextResponse.json({ success: true });
}, "org:manage");
