import { NextResponse } from "next/server";
import { db } from "@/db";
import { leaveTypes } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pick } from "@/lib/api/pick";
import { eq } from "drizzle-orm";
import { leaveTypeUpdateSchema } from "@/lib/validation/schemas";

export const PATCH = requireAuth(async (request: Request, session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const parsed = leaveTypeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updated = await db
    .update(leaveTypes)
    .set(pick(parsed.data, ["name", "code", "description", "daysAllowed", "requiresApproval", "isActive"]))
    .where(eq(leaveTypes.id, id))
    .returning()
    .get();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ leaveType: updated });
}, "leave:manage");

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  const existing = await db.select({ id: leaveTypes.id }).from(leaveTypes).where(eq(leaveTypes.id, id)).get();
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(leaveTypes).where(eq(leaveTypes.id, id)).run();
  return NextResponse.json({ success: true });
}, "leave:manage");
