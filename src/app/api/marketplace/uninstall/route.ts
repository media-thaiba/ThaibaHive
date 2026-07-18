import { NextResponse } from "next/server";
import { db } from "@/db";
import { userAppAssignments, marketplaceApps, auditLog } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";

export const DELETE = requireAuth(async (request: Request, session) => {
  const appId = new URL(request.url).searchParams.get("appId");

  if (!appId) {
    return NextResponse.json({ error: "appId is required" }, { status: 400 });
  }

  const assignment = await db
    .select()
    .from(userAppAssignments)
    .where(
      and(
        eq(userAppAssignments.staffId, session.staffId),
        eq(userAppAssignments.appId, appId)
      )
    )
    .get();

  if (!assignment || assignment.status !== "active") {
    return NextResponse.json({ error: "App not installed" }, { status: 404 });
  }

  await db
    .update(userAppAssignments)
    .set({
      status: "revoked",
      revokedAt: new Date().toISOString(),
      revokedById: session.staffId,
      revokedReason: "Self-uninstalled",
    })
    .where(eq(userAppAssignments.id, assignment.id))
    .run();

  await db.insert(auditLog).values({
    id: crypto.randomUUID(),
    staffId: session.staffId,
    action: "app_uninstalled",
    entityType: "user_app_assignment",
    entityId: assignment.id,
    details: { appId, selfRevoked: true },
  }).run();

  const app = await db
    .select({ name: marketplaceApps.name })
    .from(marketplaceApps)
    .where(eq(marketplaceApps.id, appId))
    .get();

  return NextResponse.json({ success: true, message: `${app?.name ?? "App"} removed` });
}, "attendance:read");
