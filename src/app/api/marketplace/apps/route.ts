import { NextResponse } from "next/server";
import { db } from "@/db";
import { marketplaceApps, userAppAssignments, accessRequests } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { eq, and } from "drizzle-orm";

export const GET = requireAuth(async (_request, session) => {
  const apps = await db
    .select()
    .from(marketplaceApps)
    .where(eq(marketplaceApps.isActive, true))
    .all();

  const assignments = await db
    .select()
    .from(userAppAssignments)
    .where(eq(userAppAssignments.staffId, session.staffId))
    .all();

  const pendingRequests = await db
    .select()
    .from(accessRequests)
    .where(
      and(
        eq(accessRequests.staffId, session.staffId),
        eq(accessRequests.status, "pending")
      )
    )
    .all();

  const assignmentMap = new Map(assignments.map((a) => [a.appId, a]));
  const requestMap = new Map(pendingRequests.map((r) => [r.appId, r]));

  const enriched = apps.map((app) => {
    const assignment = assignmentMap.get(app.id);
    const pendingRequest = requestMap.get(app.id);

    let status: "not_installed" | "installed" | "pending_request" = "not_installed";
    if (assignment && assignment.status === "active") status = "installed";
    else if (pendingRequest) status = "pending_request";

    return {
      ...app,
      status,
      installedAt: assignment?.installedAt ?? null,
    };
  });

  return NextResponse.json({ apps: enriched });
}, "attendance:read");
