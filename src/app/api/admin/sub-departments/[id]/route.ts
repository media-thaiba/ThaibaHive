import { NextResponse } from "next/server";
import { db } from "@/db";
import { subDepartments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  const sub = await db.select().from(subDepartments).where(eq(subDepartments.id, id)).get();
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ subDepartment: sub });
});

export const PUT = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const updated = await db
    .update(subDepartments)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(subDepartments.id, id))
    .returning()
    .get();

  return NextResponse.json({ subDepartment: updated });
}, "org:manage");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  await db.delete(subDepartments).where(eq(subDepartments.id, id)).run();
  return NextResponse.json({ success: true });
}, "org:manage");
