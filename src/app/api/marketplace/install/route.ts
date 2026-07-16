import { NextResponse } from "next/server";
import { db } from "@/db";
import { marketplaceApps, userAppAssignments, appDefaultRoles } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { appId } = body;

  if (!appId) {
    return NextResponse.json({ error: "appId is required" }, { status: 400 });
  }

  const app = await db
    .select()
    .from(marketplaceApps)
    .where(eq(marketplaceApps.id, appId))
    .get();

  if (!app) {
    return NextResponse.json({ error: "App not found" }, { status: 404 });
  }

  if (app.category !== "instant") {
    return NextResponse.json(
      { error: "Only instant apps can be installed directly. Use access request for restricted apps." },
      { status: 403 }
    );
  }

  const existing = await db
    .select()
    .from(userAppAssignments)
    .where(
      and(
        eq(userAppAssignments.staffId, session.staffId),
        eq(userAppAssignments.appId, appId)
      )
    )
    .get();

  if (existing && existing.status === "active") {
    return NextResponse.json({ error: "Already installed" }, { status: 409 });
  }

  const defaultRole = await db
    .select()
    .from(appDefaultRoles)
    .where(
      and(
        eq(appDefaultRoles.appId, appId),
        eq(appDefaultRoles.isDefault, true)
      )
    )
    .get();

  if (!defaultRole) {
    return NextResponse.json({ error: "No default role configured for this app" }, { status: 500 });
  }

  if (existing) {
    await db
      .update(userAppAssignments)
      .set({ status: "active", roleId: defaultRole.id, revokedAt: null, revokedById: null, revokedReason: null })
      .where(eq(userAppAssignments.id, existing.id))
      .run();
  } else {
    await db.insert(userAppAssignments).values({
      id: crypto.randomUUID(),
      staffId: session.staffId,
      appId,
      roleId: defaultRole.id,
      status: "active",
    }).run();
  }

  return NextResponse.json({ success: true, message: `${app.name} installed` });
}, "attendance:read");
