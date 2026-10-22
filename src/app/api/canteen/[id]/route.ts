import { NextResponse } from "next/server";
import { db } from "@/db";
import { mealNotifications } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { resolveScopedInstitutionId } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { canAccessStaff } from "@/lib/auth/department-scope";
import { checkRateLimit, rateLimitResponse } from "@/lib/api/rate-limit";

export const DELETE = requireAuth(async (request, session, context) => {
  const rl = checkRateLimit(session.staffId, "write");
  if (!rl.allowed) return rateLimitResponse(rl.resetMs);

  const params = context?.params ? await context.params : {};
  let id: string | undefined = params.id;
  if (!id) {
    const url = new URL(request.url);
    id = url.pathname.split("/").pop();
  }
  if (!id) {
    return NextResponse.json({ error: "Meal notification ID is required" }, { status: 400 });
  }

  const scopedInstitutionId = await resolveScopedInstitutionId(session.institutionId, session);
  const whereClause = scopedInstitutionId && scopedInstitutionId !== "global"
    ? and(eq(mealNotifications.id, id), eq(mealNotifications.institutionId, scopedInstitutionId))
    : eq(mealNotifications.id, id);

  const existing = await db
    .select()
    .from(mealNotifications)
    .where(whereClause)
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

  await db.delete(mealNotifications).where(whereClause).run();
  return NextResponse.json({ success: true });
}, "canteen:delete");
