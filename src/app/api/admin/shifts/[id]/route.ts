import { NextResponse } from "next/server";
import { db } from "@/db";
import { shifts } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { pick } from "@/lib/api/pick";
import { eq } from "drizzle-orm";

export const PUT = requireAuth(async (request: Request, _session, context) => {
  const { id } = await context!.params;
  const body = await request.json();

  const updated = await db
    .update(shifts)
    .set({
      ...pick(body, ["name", "startTime", "endTime", "gracePeriodMinutes", "departmentId", "applicableToAll"]),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(shifts.id, id))
    .returning()
    .get();

  return NextResponse.json({ shift: updated });
}, "attendance:manage");

export const DELETE = requireAuth(async (_request, _session, context) => {
  const { id } = await context!.params;
  await db.delete(shifts).where(eq(shifts.id, id)).run();
  return NextResponse.json({ success: true });
}, "attendance:manage");
