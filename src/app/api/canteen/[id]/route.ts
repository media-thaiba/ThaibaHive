import { NextResponse } from "next/server";
import { db } from "@/db";
import { mealNotifications } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq } from "drizzle-orm";
import { canAccessStaff } from "@/lib/auth/department-scope";

export const DELETE = requireAuth(async (_request, session, context) => {
  const { id } = await context!.params;
  
  const existing = await db
    .select()
    .from(mealNotifications)
    .where(eq(mealNotifications.id, id))
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (session.role !== "super_admin" && session.role !== "admin") {
    const hasAccess = await canAccessStaff(session.staffId, session.role, existing.staffId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db.delete(mealNotifications).where(eq(mealNotifications.id, id)).run();
  return NextResponse.json({ success: true });
}, "canteen:delete");

