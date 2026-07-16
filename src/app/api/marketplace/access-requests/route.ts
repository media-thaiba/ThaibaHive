import { NextResponse } from "next/server";
import { db } from "@/db";
import { accessRequests, marketplaceApps, departments, appDefaultRoles } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and, desc } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  const requests = await db
    .select({
      id: accessRequests.id,
      appId: accessRequests.appId,
      status: accessRequests.status,
      reason: accessRequests.reason,
      routedToId: accessRequests.routedToId,
      reviewedAt: accessRequests.reviewedAt,
      reviewNotes: accessRequests.reviewNotes,
      createdAt: accessRequests.createdAt,
      appName: marketplaceApps.name,
      appSlug: marketplaceApps.slug,
    })
    .from(accessRequests)
    .leftJoin(marketplaceApps, eq(accessRequests.appId, marketplaceApps.id))
    .where(eq(accessRequests.staffId, session.staffId))
    .orderBy(desc(accessRequests.createdAt))
    .all();

  return NextResponse.json({ requests });
}, "attendance:read");

export const POST = requireAuth(async (request: Request, session) => {
  const body = await request.json();
  const { appId, reason } = body;

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

  if (app.category !== "restricted") {
    return NextResponse.json({ error: "Only restricted apps require access requests" }, { status: 400 });
  }

  const pending = await db
    .select()
    .from(accessRequests)
    .where(
      and(
        eq(accessRequests.staffId, session.staffId),
        eq(accessRequests.appId, appId),
        eq(accessRequests.status, "pending")
      )
    )
    .get();

  if (pending) {
    return NextResponse.json({ error: "You already have a pending request for this app" }, { status: 409 });
  }

  let routedToId: string | null = null;
  if (app.departmentId) {
    const dept = await db
      .select()
      .from(departments)
      .where(eq(departments.id, app.departmentId))
      .get();
    routedToId = dept?.headUserId ?? null;
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

  const accessRequest = await db.insert(accessRequests).values({
    id: crypto.randomUUID(),
    staffId: session.staffId,
    appId,
    reason: reason || null,
    assignedRoleId: defaultRole?.id ?? null,
    routedToId,
  }).returning().get();

  return NextResponse.json({ request: accessRequest }, { status: 201 });
}, "attendance:read");
