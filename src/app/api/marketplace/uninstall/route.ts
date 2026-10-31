import { NextResponse } from "next/server";
import { db } from "@/db";
import { userAppAssignments, marketplaceApps, auditLog, staff, userSessions } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, sql } from "drizzle-orm";

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

  const app = await db
    .select({ name: marketplaceApps.name })
    .from(marketplaceApps)
    .where(eq(marketplaceApps.id, appId))
    .get();

  await db.transaction(async (tx) => {
    await tx
      .update(userAppAssignments)
      .set({
        status: "revoked",
        revokedAt: new Date().toISOString(),
        revokedById: session.staffId,
        revokedReason: "Self-uninstalled",
      })
      .where(eq(userAppAssignments.id, assignment.id))
      .run();

    // Force re-evaluation of permissions on next request
    await tx
      .update(staff)
      .set({ tokenVersion: sql`coalesce(${staff.tokenVersion}, 1) + 1` })
      .where(eq(staff.id, session.staffId))
      .run();

    await tx
      .update(userSessions)
      .set({ status: "terminated", logoutAt: Date.now() })
      .where(and(eq(userSessions.staffId, session.staffId), eq(userSessions.status, "active")))
      .run();

    await tx.insert(auditLog).values({
      id: crypto.randomUUID(),
      staffId: session.staffId,
      action: "app_uninstalled",
      entityType: "user_app_assignment",
      entityId: assignment.id,
      details: { appId, selfRevoked: true },
    }).run();
  });

  return NextResponse.json({ success: true, message: `${app?.name ?? "App"} removed` });
}, "marketplace:uninstall");
