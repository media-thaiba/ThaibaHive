import { NextResponse } from "next/server";
import { db } from "@/db";
import { subDepartments, departments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pick } from "@/lib/api/pick";
import { eq } from "drizzle-orm";
import { adminSubDepartmentUpdateSchema } from "@/lib/validation/schemas";

async function findScopedSubDepartment(id: string, instScope: string | null) {
  const sub = await db.select().from(subDepartments).where(eq(subDepartments.id, id)).get();
  if (!sub) return null;
  if (instScope) {
    const dept = await db
      .select({ institutionId: departments.institutionId })
      .from(departments)
      .where(eq(departments.id, sub.departmentId))
      .get();
    if (!dept || dept.institutionId !== instScope) {
      return null;
    }
  }
  return sub;
}

export const GET = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;
  const sub = await findScopedSubDepartment(id, instScope);
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ subDepartment: sub });
}, "org:manage");

export const PUT = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const parsed = adminSubDepartmentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;
  const existing = await findScopedSubDepartment(id, instScope);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db
    .update(subDepartments)
    .set({
      ...pick(parsed.data, ["name", "code", "description"]),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(subDepartments.id, id))
    .returning()
    .get();

  return NextResponse.json({ subDepartment: updated });
}, "org:manage");

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const instScope =
    session.institutionId && session.institutionId !== "global" ? session.institutionId : null;
  const existing = await findScopedSubDepartment(id, instScope);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(subDepartments).where(eq(subDepartments.id, id)).run();
  return NextResponse.json({ success: true });
}, "org:manage");
