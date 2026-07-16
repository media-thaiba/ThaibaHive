import { NextResponse } from "next/server";
import { db } from "@/db";
import { institutions, departments } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pick } from "@/lib/api/pick";
import { eq } from "drizzle-orm";

export const GET = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  const inst = await db.select().from(institutions).where(eq(institutions.id, id)).get();
  if (!inst) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ institution: inst });
});

export const PUT = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const inst = await db.select().from(institutions).where(eq(institutions.id, id)).get();
  if (!inst) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db
    .update(institutions)
    .set({
      ...pick(body, ["name", "code", "type", "address", "phone", "email"]),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(institutions.id, id))
    .returning()
    .get();

  return NextResponse.json({ institution: updated });
}, "org:manage");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;

  const deptCount = await db.select().from(departments).where(eq(departments.institutionId, id)).all();
  if (deptCount.length > 0) {
    return NextResponse.json({ error: "Remove all departments first" }, { status: 400 });
  }

  await db.delete(institutions).where(eq(institutions.id, id)).run();
  return NextResponse.json({ success: true });
}, "org:manage");
